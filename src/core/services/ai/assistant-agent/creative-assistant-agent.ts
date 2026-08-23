import type {
  AgentActionResult,
  AssistantAgentEvent,
  AssistantAgentImage,
  AssistantAgentMessage,
  AssistantAgentSnapshot,
  AssistantTurnRequest,
  CreativeAssistantAgentDependencies,
} from './types';

function defaultId(): string {
  return `assistant-turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class CreativeAssistantAgent<State, Candidate> {
  private readonly deps: CreativeAssistantAgentDependencies<State, Candidate>;
  private readonly id: () => string;
  private controller: AbortController | null = null;
  private messages: AssistantAgentMessage[] = [];
  private memory: State | null = null;
  private pendingCandidate: { raw: string; value: Candidate } | null = null;
  private activeTurn = false;
  private latestImage: AssistantAgentImage | undefined;
  private lastRequest: AssistantTurnRequest | null = null;

  constructor(deps: CreativeAssistantAgentDependencies<State, Candidate>) {
    this.deps = deps;
    this.id = deps.id ?? defaultId;
  }

  getSnapshot(): AssistantAgentSnapshot<State, Candidate> {
    return {
      projectId: this.deps.projectId,
      messages: this.messages.map((message) => ({ ...message })),
      memory: this.memory,
      pendingCandidate: this.pendingCandidate,
      activeTurn: this.activeTurn,
    };
  }

  async *sendTurn(request: AssistantTurnRequest): AsyncGenerator<AssistantAgentEvent<State>> {
    this.lastRequest = request;
    const turnId = this.id();
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.activeTurn = true;
    let content = '';
    let raw = '';
    let parsed: { content: string; state: State | null } = { content: '', state: null };
    const userMessage: AssistantAgentMessage = { role: 'user', content: request.text };
    this.messages = [...this.messages, userMessage];
    yield { type: 'started', turnId };

    try {
      const messages = this.deps.prompt.buildMessages({
        request,
        selectedSkillIds: request.selectedSkillIds ?? [],
        memory: this.memory,
        messages: this.messages,
      });
      for await (const event of this.deps.dialogue.stream(messages, controller.signal)) {
        if (controller.signal.aborted) break;
        if (event.kind === 'thinking') {
          yield { type: 'thinking', turnId, text: event.text };
          continue;
        }
        raw += event.text;
        yield { type: 'text', turnId, text: event.text };
      }

      if (controller.signal.aborted) {
        yield { type: 'cancelled', turnId, content };
        return;
      }

      parsed = this.deps.prompt.parseResponse(raw);
      content = parsed.content;
      this.messages = [...this.messages, { role: 'assistant', content }];
      if (parsed.state) yield { type: 'state', turnId, state: parsed.state };

      if (this.deps.image && this.deps.imageIntent?.(request.text)) {
        const image = await this.deps.image.generate(request.text, this.latestImage);
        this.latestImage = image;
        yield { type: 'image', turnId, image };
      }

      yield { type: 'completed', turnId, content, state: parsed.state };
    } catch (error) {
      if (controller.signal.aborted) {
        yield { type: 'cancelled', turnId, content };
      } else {
        yield {
          type: 'failed',
          turnId,
          error: error instanceof Error ? error : new Error(String(error)),
          content,
        };
      }
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        this.activeTurn = false;
      }
    }
  }

  cancel(): void {
    this.controller?.abort();
  }

  retryTurn(): AsyncGenerator<AssistantAgentEvent<State>> {
    if (!this.lastRequest) throw new Error('No assistant turn to retry');
    return this.sendTurn(this.lastRequest);
  }

  clearConversation(): void {
    this.cancel();
    this.messages = [];
    this.pendingCandidate = null;
    this.latestImage = undefined;
    this.lastRequest = null;
  }

  createCandidate(raw: string): { raw: string; value: Candidate } {
    if (!this.deps.target) throw new Error('Target adapter is not configured');
    this.pendingCandidate = { raw, value: this.deps.target.parseCandidate(raw) };
    return this.pendingCandidate;
  }

  async applyCandidate(): Promise<AgentActionResult> {
    if (!this.deps.target || !this.pendingCandidate) {
      return { status: 'rejected', reason: 'No pending candidate' };
    }
    await this.deps.target.applyCandidate(this.pendingCandidate.value);
    return { status: 'applied' };
  }

  async persistCandidate(): Promise<AgentActionResult> {
    if (!this.deps.target || !this.pendingCandidate) {
      return { status: 'rejected', reason: 'No pending candidate' };
    }
    const saved = await this.deps.target.persist();
    return saved === false
      ? { status: 'rejected', reason: 'Persistence rejected' }
      : { status: 'saved' };
  }

  async saveMemory(state: State): Promise<AgentActionResult> {
    if (!this.deps.memory)
      return { status: 'rejected', reason: 'Memory adapter is not configured' };
    await this.deps.memory.save(this.deps.projectId, state);
    this.memory = state;
    return { status: 'saved' };
  }

  async generateImage(
    prompt: string,
    latestImage?: AssistantAgentImage
  ): Promise<AssistantAgentImage> {
    if (!this.deps.image) throw new Error('Image adapter is not configured');
    const image = await this.deps.image.generate(prompt, latestImage ?? this.latestImage);
    this.latestImage = image;
    return image;
  }
}

export function createCreativeAssistantAgent<State, Candidate>(
  deps: CreativeAssistantAgentDependencies<State, Candidate>
): CreativeAssistantAgent<State, Candidate> {
  return new CreativeAssistantAgent(deps);
}
