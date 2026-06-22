"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Download, History, ImagePlus, LayoutTemplate, Send, Sparkles, Wand2 } from "lucide-react";

const scripts = ["楷书", "行书", "草书", "隶书", "篆书"];
const masters = ["王羲之", "颜真卿", "柳公权", "欧阳询", "褚遂良", "米芾", "赵孟頫"];
const formats = ["中堂", "条幅", "横幅", "对联", "扇面"];

const presets = [
  { label: "书房雅句", text: "静以修身", script: "楷书", master: "欧阳询", format: "横幅" },
  { label: "斗方祝福", text: "福寿康宁", script: "隶书", master: "赵孟頫", format: "中堂" },
  { label: "行书题赠", text: "清风入怀", script: "行书", master: "王羲之", format: "条幅" },
  { label: "新春对联", text: "春风得意\n福满人间", script: "楷书", master: "颜真卿", format: "对联" },
];

const questionExamples = [
  "临《兰亭序》时如何观察行气？",
  "颜真卿楷书适合初学者吗？",
  "横幅作品落款和印章怎么安排？",
];

const scriptNotes = {
  楷书: "端正严谨，适合入门、题匾、格言和庄重场景。",
  行书: "流动自然，适合题赠、诗句和日常创作。",
  草书: "节奏强烈，适合表现情绪与速度感。",
  隶书: "蚕头燕尾，古朴舒展，适合横幅和雅句。",
  篆书: "圆转古雅，适合印章感、古文字风格和装饰性作品。",
};

const masterNotes = {
  王羲之: "清和流美，重行气与牵丝映带。",
  颜真卿: "宽博雄强，适合厚重端庄的内容。",
  柳公权: "骨力劲健，结字清瘦挺拔。",
  欧阳询: "险劲严整，适合结构训练。",
  褚遂良: "秀逸灵动，线条富弹性。",
  米芾: "欹侧多变，适合行书表达。",
  赵孟頫: "温润秀雅，适合柔和文气。",
};

const defaultForm = {
  text: "厚德载物",
  script: "楷书",
  master: "颜真卿",
  format: "中堂",
};

export default function Home() {
  const [question, setQuestion] = useState("初学楷书应该怎样选择碑帖？");
  const [answer, setAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [artwork, setArtwork] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [layoutAdvice, setLayoutAdvice] = useState(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [works, setWorks] = useState([]);
  const [notice, setNotice] = useState("");

  const selectedSummary = useMemo(() => {
    return `${form.script} · ${form.master} · ${form.format}`;
  }, [form]);

  const quickLayout = useMemo(() => {
    const count = Array.from(form.text || "").filter((char) => char !== "\n").length;
    if (form.format === "对联") return "右联起笔、左联收束，左右字数和重心尽量一致，落款置左联外侧。";
    if (form.format === "横幅") return "横向展开，左右留白均衡，落款宜放左侧或左下。";
    if (count <= 4) return "正文居中，字距略放宽，四周留白多一些更显雅致。";
    return "可按语义分行，行距略大于字距，落款与印章形成左下呼应。";
  }, [form]);

  async function loadWorks() {
    const response = await fetch("/api/works");
    const data = await response.json();
    setWorks(data.works || []);
  }

  useEffect(() => {
    loadWorks().catch(() => setNotice("历史作品暂时读取失败，请稍后重试。"));
  }, []);

  async function submitChat(event) {
    event.preventDefault();
    setChatLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "问答接口请求失败");
      setAnswer(data.answer);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setChatLoading(false);
    }
  }

  async function generateArtwork(event) {
    event.preventDefault();
    setGenerateLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/generate-calligraphy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "作品生成接口请求失败");
      setArtwork(data);
      if (data.work?.inputText) {
        setForm((current) => ({ ...current, text: data.work.inputText }));
      }
      await loadWorks();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setGenerateLoading(false);
    }
  }

  async function requestLayoutAdvice(event) {
    event.preventDefault();
    setLayoutLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/layout-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: form.text, format: form.format }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "章法接口请求失败");
      setLayoutAdvice(data.advice);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLayoutLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyPreset(preset) {
    setForm({
      text: preset.text,
      script: preset.script,
      master: preset.master,
      format: preset.format,
    });
    setLayoutAdvice(null);
    setArtwork(null);
  }

  return (
    <main>
      <section className="hero">
        <div className="heroInner">
          <div className="sealMark">墨</div>
          <div>
            <p className="eyebrow">DeepSeek 问答 · Qwen 图像生成 · 书法创作辅助</p>
            <h1>墨韵智创——AI辅助书法生成艺术平台</h1>
            <p className="intro">面向书法爱好者和学习者，围绕碑帖知识、临摹方法、章法推敲与作品生成，提供一套可演示、可创作、可分享的数字书法工作台。</p>
          </div>
        </div>
      </section>

      <section className="workspace">
        {notice && <div className="notice">{notice}</div>}

        <article className="panel quickStart">
          <div className="panelTitle">
            <Wand2 size={20} />
            <h2>创作入口</h2>
          </div>
          <div className="presetGrid">
            {presets.map((preset) => (
              <button key={preset.label} className="presetCard" type="button" onClick={() => applyPreset(preset)}>
                <strong>{preset.label}</strong>
                <span>{preset.text.replace("\n", " / ")}</span>
                <small>
                  {preset.script} · {preset.master} · {preset.format}
                </small>
              </button>
            ))}
          </div>
        </article>

        <div className="grid two">
          <article className="panel">
            <div className="panelTitle">
              <BookOpenText size={20} />
              <h2>书法知识问答</h2>
            </div>
            <form onSubmit={submitChat} className="stack">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
                placeholder="输入书法史、书体、碑帖、名家、技法、章法、临摹方法等问题"
              />
              <button type="submit" disabled={chatLoading}>
                <Send size={18} />
                {chatLoading ? "思考中" : "提交问题"}
              </button>
            </form>
            <div className="chips">
              {questionExamples.map((item) => (
                <button key={item} type="button" className="chip" onClick={() => setQuestion(item)}>
                  {item}
                </button>
              ))}
            </div>
            <div className="answerBox">{answer || "回答会显示在这里。可咨询碑帖选择、书体特点、临摹路径、笔法章法等问题。"}</div>
          </article>

          <article className="panel">
            <div className="panelTitle">
              <LayoutTemplate size={20} />
              <h2>章法设计</h2>
            </div>
            <form onSubmit={requestLayoutAdvice} className="stack">
              <div className="inlineFields">
                <label>
                  创作文字
                  <input value={form.text} onChange={(event) => updateForm("text", event.target.value)} />
                </label>
                <label>
                  作品形式
                  <select value={form.format} onChange={(event) => updateForm("format", event.target.value)}>
                    {formats.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="submit" disabled={layoutLoading}>
                <Sparkles size={18} />
                {layoutLoading ? "生成中" : "生成章法建议"}
              </button>
            </form>
            <Advice advice={layoutAdvice} />
            <div className="hintBox">
              <strong>当前章法预判</strong>
              <span>{quickLayout}</span>
            </div>
          </article>
        </div>

        <article className="panel generator">
          <div className="panelTitle">
            <ImagePlus size={20} />
            <h2>AI书法作品生成</h2>
          </div>
          <form onSubmit={generateArtwork} className="generateForm">
            <label className="wide">
              生成文字
              <textarea className="compactText" value={form.text} onChange={(event) => updateForm("text", event.target.value)} maxLength={32} />
            </label>
            <label>
              书体
              <select value={form.script} onChange={(event) => updateForm("script", event.target.value)}>
                {scripts.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              风格参考
              <select value={form.master} onChange={(event) => updateForm("master", event.target.value)}>
                {masters.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              作品形式
              <select value={form.format} onChange={(event) => updateForm("format", event.target.value)}>
                {formats.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={generateLoading}>
              <Sparkles size={18} />
              {generateLoading ? "生成中" : "生成作品"}
            </button>
          </form>

          <div className="selectionNotes">
            <div>
              <strong>{form.script}</strong>
              <span>{scriptNotes[form.script]}</span>
            </div>
            <div>
              <strong>{form.master}</strong>
              <span>{masterNotes[form.master]}</span>
            </div>
            <div>
              <strong>{form.format}</strong>
              <span>{quickLayout}</span>
            </div>
          </div>

          <div className="resultGrid">
            <div className="artPreview">
              {generateLoading ? (
                <div className="generating">
                  <Sparkles size={26} />
                  <strong>正在研墨生成</strong>
                  <span>图片模型需要数秒到几十秒，请稍候。</span>
                </div>
              ) : artwork?.imageUrl ? (
                <img src={artwork.imageUrl} alt="AI生成书法作品" />
              ) : (
                <div className="emptyArt">
                  <span>墨</span>
                  <p>{selectedSummary}</p>
                </div>
              )}
            </div>
            <div className="promptBox">
              <h3>作品说明</h3>
              <div className="metaGrid">
                <span>内容：{(artwork?.work?.inputText || form.text).replace("\n", " / ")}</span>
                <span>书体：{form.script}</span>
                <span>风格：{form.master}</span>
                <span>形式：{form.format}</span>
              </div>
              <h3>图片生成提示词</h3>
              <p>{artwork?.prompt || "生成后将在这里显示自动组合的图片提示词，后续可直接传给真实图片模型。"}</p>
              {artwork?.imageUrl && (
                <a className="download" href={artwork.imageUrl} download={`墨韵智创-${artwork?.work?.inputText || form.text}.png`}>
                  <Download size={18} />
                  下载图片
                </a>
              )}
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panelTitle">
            <History size={20} />
            <h2>历史作品</h2>
          </div>
          <div className="historyGrid">
            {works.length === 0 && <p className="muted">暂无生成记录。</p>}
            {works.map((work) => (
              <button
                key={work.id}
                className="workCard"
                onClick={() => {
                  setForm({ text: work.inputText, script: work.script, master: work.master, format: work.format });
                  setArtwork({ imageUrl: work.imageUrl, prompt: work.prompt });
                }}
              >
                <img src={work.imageUrl} alt={`${work.inputText} 书法作品`} />
                <span>{work.inputText}</span>
                <small>
                  {work.script} · {work.master} · {work.format}
                </small>
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Advice({ advice }) {
  if (!advice) {
    return <div className="answerBox">章法建议会包含字距、行距、落款位置、印章位置和整体布局。</div>;
  }

  const rows = [
    ["字距", advice.charSpacing],
    ["行距", advice.lineSpacing],
    ["落款", advice.signature],
    ["印章", advice.seal],
    ["整体", advice.overall],
  ];

  return (
    <dl className="adviceList">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
