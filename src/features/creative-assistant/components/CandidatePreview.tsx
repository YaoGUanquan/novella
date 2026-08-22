import React from 'react';

import type { CandidatePreviewNode } from '../candidate-preview';
import { buildCandidatePreview, isCompactPreviewValue } from '../candidate-preview';

function PreviewNodes({ nodes, nested }: { nodes: CandidatePreviewNode[]; nested?: boolean }) {
  return (
    <div className={nested ? 'space-y-1' : 'space-y-3'}>
      {nodes.map((node, index) => (
        <PreviewNode key={`${node.kind}-${index}`} node={node} />
      ))}
    </div>
  );
}

function PreviewNode({ node }: { node: CandidatePreviewNode }) {
  switch (node.kind) {
    case 'field':
      return isCompactPreviewValue(node.value) ? (
        <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-baseline gap-x-3 py-0.5">
          <p className="text-[11px] leading-5 text-slate-300">{node.label}</p>
          <p className="min-w-0 break-words text-sm leading-5 text-white">{node.value}</p>
        </div>
      ) : (
        <div className="space-y-0.5 py-0.5">
          <p className="text-[11px] leading-5 text-slate-300">{node.label}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-5 text-white">
            {node.value}
          </p>
        </div>
      );
    case 'group':
      return (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-emerald-200">{node.label}</p>
          <PreviewNodes nodes={node.children} nested />
        </div>
      );
    case 'item':
      return (
        <div className="space-y-1 rounded-md border border-slate-500 bg-slate-700 px-2.5 py-2">
          {node.title ? <p className="text-sm font-semibold text-white">{node.title}</p> : null}
          <PreviewNodes nodes={node.children} nested />
        </div>
      );
    default: {
      const exhaustive: never = node;
      return exhaustive;
    }
  }
}

export function CandidatePreview({ value }: { value: unknown }) {
  const nodes = buildCandidatePreview(value);
  if (nodes.length === 0) {
    return <p className="text-sm text-slate-200">没有可展示的字段。</p>;
  }
  return (
    <div
      data-testid="creative-assistant-candidate-preview"
      className="max-h-64 overflow-auto rounded-md border border-slate-600 bg-slate-800 p-3 text-white"
    >
      <PreviewNodes nodes={nodes} />
    </div>
  );
}
