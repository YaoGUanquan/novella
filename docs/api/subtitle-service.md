# Subtitle Service

`subtitleService` 从 `@/core/services` 导出；纯函数也可从 `@/core/services/video/subtitle` 导入。字幕时间单位是秒，轨道使用 `SubtitleTrack`，条目使用 `SubtitleItem`。

## 生成和调整

```ts
const track = subtitleService.generateFromScript(script.segments, {
  fontSize: 28,
  position: 'bottom',
});

const shifted = subtitleService.adjustTiming(track, 0.5, 1.0);
const merged = subtitleService.mergeTracks([track, shifted]);
```

`generateFromText(text, timeframes, style?)` 使用 `SubtitleTimeframe[]`（`start`、`end`、`text`）创建轨道。当前实现保留了兼容签名，其中 `text` 参数不会参与生成。

## 导入和导出

```ts
const imported = subtitleService.importSubtitles(fileText, 'episode.srt');
const srt = subtitleService.exportSubtitles(imported, 'srt');
const vtt = subtitleService.exportSubtitles(imported, 'vtt');
```

支持 `srt`、`vtt`、`ass` 和 `txt`。也可以直接使用 `parseSRT`、`parseVTT`、`exportSRT`、`exportVTT`、`exportASS`、`exportTXT`。解析器遇到无效字幕块时会跳过该块并返回其余结果。

## AI 生成和翻译

```ts
const generated = await subtitleService.generateFromVideo('一名角色在雨中奔跑', 30, {
  fontSize: 24,
});

const translated = await subtitleService.translateSubtitles(generated, 'en-US');
```

AI 字幕生成依赖 `aiService`。生成失败时返回空字幕轨道；单条翻译失败时保留原文并继续处理其他条目。

## 类型和样式

可从 `@/core/services/video/subtitle` 导入 `SubtitleTrack`、`SubtitleItem`、`SubtitleStyle`、`SubtitleTimeframe`、`SubtitleFormat`、`DEFAULT_SUBTITLE_STYLE` 和 `ASS_STYLE_PRESETS`。样式使用 CSS 颜色字符串；ASS 导出会转换颜色和对齐方式。
