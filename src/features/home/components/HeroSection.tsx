import {
  Plus,
  Wand2,
  FileText,
  Maximize2,
  Sparkles,
  Clapperboard,
  Users,
  Film,
  Share2,
  Zap,
  Bot,
  Activity,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateProjectModal from '@/features/project/components/AICreateProjectModal';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';

const SAMPLE_SCRIPTS = [
  {
    title: '【赛博修仙】数字元神与机械灵脉',
    genre: '科幻修仙',
    episodes: '全 12 集',
    desc: '在 2099 年的赛博修仙界，李云霄借助数字元神侵入天道服务器，反抗脑机修仙财阀的统治。',
    snippet: `第一章：数字元神觉醒

夜色笼罩着深霄市的钛合金高楼，霓虹雨打在李云霄的金属手臂上，迸发出刺目的火花。
李云霄：“天道服务器的防护墙，也不过如此。”
他闭上双眼，脑机接口瞬间过载，一道金色的数字元神化作飞剑，径直刺入黑神轨财阀的核心数据中枢！`,
  },
  {
    title: '【都市战神】龙王归来之隐性首富',
    genre: '都市热血',
    episodes: '全 24 集',
    desc: '隐姓埋名三年的战神陆天龙重新出山，挥手间执掌万亿资本，护娇妻斩情仇。',
    snippet: `第一章：战神解封

江城拍卖会上，众人肆意嘲笑身着简朴工装的陆天龙。
财阀少爷：“区区一个实习生，也敢竞拍这枚龙神戒指？”
陆天龙冷笑一声，缓缓亮出暗黑金卡。
黑金秘书推门而入：“禀告战神，三千龙卫已到达战场，万亿资产随时听候调遣！”`,
  },
  {
    title: '【规则怪谈】千万别看后视镜',
    genre: '悬疑惊悚',
    episodes: '全 8 集',
    desc: '诡异复苏，苏明继承了一辆编号 404 的夜间公交车，只要遵循守则便能在这诡异规则中存活。',
    snippet: `第一章：守则第一条

【夜间公交驾驶守则】
1. 听到后排哭声时，千万不要看后视镜。
2. 遇到穿红色风衣的乘客，请在下一站立刻开启车门。
苏明握紧方向盘，手心全掌出汗。此时，车内后排突然传来低沉刺耳的哭泣声...`,
  },
];

const PIPELINE_STEPS = [
  { id: 1, name: '策划设定', icon: FileText, done: true },
  { id: 2, name: '画面生成', icon: Film, active: true },
  { id: 3, name: '动态合成', icon: Activity, done: false },
  { id: 4, name: '声音后期', icon: Clapperboard, done: false },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleSelectSample = (sample: (typeof SAMPLE_SCRIPTS)[0]) => {
    setIsSampleModalOpen(false);
    navigate('/workflow', { state: { sampleContent: sample.snippet, sampleTitle: sample.title } });
  };

  return (
    <div className="space-y-4 mb-6">
      {/* 首页工作流预览 */}
      <div className="studio-card p-5 md:p-7 relative overflow-hidden border border-slate-800/80 bg-[#050810]/90 backdrop-blur-xl rounded-3xl space-y-6 shadow-2xl">
        {/* 展台大卡片两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* 左侧 & 中间：主视听播放器与 SOP 步骤指示器 */}
          <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
            {/* 标题与 SOP 阶段 Pills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-100 flex flex-wrap items-center gap-2">
                    Novella AI 漫剧创作车间
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/30 font-mono font-bold">
                      工作流预览
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    从文本设定、角色资源到分镜与视频输出的创作工作台
                  </p>
                </div>

                <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex-none bg-[#00f5d4] hover:bg-[#00e0c2] text-[#050810] text-xs px-4 py-2 rounded-xl border-0 shadow-lg shadow-[#00f5d4]/20 flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新建工程
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/workflow')}
                    className="flex-none bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 font-semibold"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    AI 智能体向导
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsSampleModalOpen(true)}
                    className="flex-none bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    剧本范例
                  </Button>
                </div>
              </div>

              {/* 4 核心环节 Step Badges */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#00f5d4] text-[#050810] shadow-sm">
                    4 大核心环节流水线
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 font-bold">
                    Phase 02/04
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-3 shrink-0 text-xs">
                  {PIPELINE_STEPS.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                          step.active
                            ? 'bg-[#00f5d4]/10 text-[#00f5d4] font-bold border border-[#00f5d4]/30'
                            : step.done
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">{step.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 16:9 高清视听 Player */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/90 border border-slate-800 group shadow-2xl flex items-center justify-center">
              <img
                src="/sample-shot-1.jpg"
                alt="漫剧分镜示例"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
              />

              {/* 静态分镜预览 */}
              <button
                aria-label="查看分镜示例"
                title="查看分镜示例"
                onClick={() => setIsPreviewOpen(true)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-[#00f5d4]/90 hover:bg-[#00f5d4] text-[#050810] flex items-center justify-center shadow-xl shadow-[#00f5d4]/40 transition-transform hover:scale-110 cursor-pointer border-0 z-20"
              >
                <Maximize2 className="w-6 h-6" />
              </button>

              {/* 渲染进度条 Overlay */}
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[#00f5d4] font-bold animate-pulse">创作流程预览</span>
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00f5d4] to-purple-500 w-[85%] transition-all duration-300" />
                  </div>
                </div>
                <span className="text-slate-300 text-[11px]">阶段 02 / 04</span>
              </div>
            </div>
          </div>

          {/* 右侧：当前焦点工程面板 */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#00f5d4]" />
                  Novella 漫剧引擎
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  工作流就绪
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                统一承载对话、图像、视频和本地媒体处理能力，按项目工作流逐步产出可复用内容。
              </p>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">文本与剧本</span>
                  <span className="text-[#00f5d4] font-mono font-bold">可配置 Provider</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">角色与场景资源</span>
                  <span className="text-purple-400 font-mono font-bold">项目内复用</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">视频与音频输出</span>
                  <span className="text-emerald-400 font-mono font-bold">任务可追踪</span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              onClick={() => navigate('/workflow')}
              className="bg-[#00f5d4] hover:bg-[#00e0c2] text-[#050810] font-bold w-full text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00f5d4]/20 border-0"
            >
              <Wand2 className="w-4 h-4" />
              进入 AI 漫剧创作工作台
            </Button>
          </div>
        </div>
      </div>

      {/* 剧本范例 Modal */}
      <Dialog open={isSampleModalOpen} onOpenChange={setIsSampleModalOpen}>
        <DialogContent className="max-w-2xl bg-[#050810] border-slate-800 text-slate-100 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#00f5d4]" />
              选择热门漫剧题材范例
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              选填以下精心准备的剧本范例，一键同步载入漫剧拆解车间
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 my-2">
            {SAMPLE_SCRIPTS.map((sample, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSample(sample)}
                className="p-4 rounded-xl border border-slate-800 hover:border-[#00f5d4] bg-slate-900/50 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100 group-hover:text-[#00f5d4] transition-colors">
                    {sample.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#00f5d4]/10 text-[#00f5d4] font-mono font-bold">
                      {sample.genre}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{sample.episodes}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{sample.desc}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 新建工程 Modal */}
      <CreateProjectModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>分镜示例</DialogTitle>
            <DialogDescription>静态示例画面，非当前工程生成结果。</DialogDescription>
          </DialogHeader>
          <img
            src="/sample-shot-1.jpg"
            alt="漫剧分镜示例大图"
            className="w-full aspect-video object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HeroSection;
