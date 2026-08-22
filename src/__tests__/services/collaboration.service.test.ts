import CollaborationService from '@/core/services/domain/collaboration-service';

describe('collaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    service = new CollaborationService();
  });

  it('should add and list frame comments', () => {
    service.addComment({ projectId: 'p1', frameId: 'f1', content: '镜头太长', author: 'qa' });
    service.addComment({ projectId: 'p1', frameId: 'f1', content: '建议快切', author: 'director' });

    const comments = service.listComments('p1', 'f1');
    expect(comments.length).toBe(2);
    expect(comments[0].frameId).toBe('f1');
  });

  it('should save versions and rollback payload', () => {
    const v1 = service.saveVersion({
      projectId: 'p1',
      label: 'v1',
      createdBy: 'dev',
      payload: [{ id: 'f1', title: 'A' }],
    });
    const v2 = service.saveVersion({
      projectId: 'p1',
      label: 'v2',
      createdBy: 'dev',
      payload: [{ id: 'f1', title: 'B' }],
    });

    const diff = service.diffVersions(v1.id, v2.id);
    expect(diff.changeCount).toBeGreaterThan(0);

    const rollbackPayload = service.rollback('p1', v1.id) as Array<{ title: string }>;
    expect(rollbackPayload[0].title).toBe('A');
  });

  it('hydrates comments and versions for the requested project only', () => {
    service.hydrate(
      'p1',
      [
        {
          id: 'comment-1',
          projectId: 'p1',
          frameId: 'f1',
          content: '已恢复评论',
          author: 'qa',
          createdAt: '2026-08-22T00:00:00.000Z',
        },
        {
          id: 'comment-2',
          projectId: 'p2',
          frameId: 'f1',
          content: '其他工程',
          author: 'qa',
          createdAt: '2026-08-22T00:00:00.000Z',
        },
      ],
      [
        {
          id: 'version-1',
          projectId: 'p1',
          label: '恢复版本',
          createdBy: 'qa',
          createdAt: '2026-08-22T00:00:00.000Z',
          payload: [],
        },
        {
          id: 'version-2',
          projectId: 'p2',
          label: '其他工程',
          createdBy: 'qa',
          createdAt: '2026-08-22T00:00:00.000Z',
          payload: [],
        },
      ]
    );

    expect(service.listComments('p1', 'f1')).toEqual([
      expect.objectContaining({ id: 'comment-1', content: '已恢复评论' }),
    ]);
    expect(service.listVersions('p1')).toEqual([
      expect.objectContaining({ id: 'version-1', label: '恢复版本' }),
    ]);
  });

  it('keeps storyboard version selection separate from other content types', () => {
    service.saveVersion({ projectId: 'p1', label: '分镜快照', createdBy: 'qa', payload: [] });
    service.saveVersionByType(
      { projectId: 'p1', label: '角色快照', createdBy: 'qa', payload: {} },
      'character'
    );

    expect(service.listVersionsByType('p1', 'storyboard')).toEqual([
      expect.objectContaining({ label: '分镜快照', contentType: 'storyboard' }),
    ]);
  });
});
