"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Download, History, ImagePlus, LayoutTemplate, Send, Sparkles } from "lucide-react";

const scripts = ["楷书", "行书", "草书", "隶书", "篆书"];
const masters = ["王羲之", "颜真卿", "柳公权", "欧阳询", "褚遂良", "米芾", "赵孟頫"];
const formats = ["中堂", "条幅", "横幅", "对联", "扇面"];

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

  return (
    <main>
      <section className="hero">
        <div className="heroInner">
          <div className="sealMark">墨</div>
          <div>
            <p className="eyebrow">产教实践展示 Demo</p>
            <h1>墨韵智创——AI辅助书法生成艺术平台</h1>
            <p className="intro">AI赋能书法知识学习、章法设计、作品生成与展示，辅助学习者理解传统书法并完成创作表达。</p>
          </div>
        </div>
      </section>

      <section className="workspace">
        {notice && <div className="notice">{notice}</div>}

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
            <div className="answerBox">{answer || "回答会显示在这里。mock 接口会限制回答范围，后续可替换为 DeepSeek / Qwen / GPT。"}</div>
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
              <input value={form.text} onChange={(event) => updateForm("text", event.target.value)} maxLength={24} />
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

          <div className="resultGrid">
            <div className="artPreview">
              {artwork?.imageUrl ? (
                <img src={artwork.imageUrl} alt="AI生成书法作品" />
              ) : (
                <div className="emptyArt">
                  <span>墨</span>
                  <p>{selectedSummary}</p>
                </div>
              )}
            </div>
            <div className="promptBox">
              <h3>图片生成提示词</h3>
              <p>{artwork?.prompt || "生成后将在这里显示自动组合的图片提示词，后续可直接传给真实图片模型。"}</p>
              {artwork?.imageUrl && (
                <a className="download" href={artwork.imageUrl} download={`墨韵智创-${form.text}.svg`}>
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
              <button key={work.id} className="workCard" onClick={() => setArtwork({ imageUrl: work.imageUrl, prompt: work.prompt })}>
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
