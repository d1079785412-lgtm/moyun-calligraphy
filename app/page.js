"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Download, History, ImagePlus, Send, Sparkles, Wand2 } from "lucide-react";

const scripts = ["楷书", "隶书", "篆书"];
const scriptMasterMap = {
  楷书: "褚遂良",
  隶书: "曹全碑",
  篆书: "铁线篆",
};
const formats = ["中堂", "条幅", "横幅", "对联", "扇面"];

const formatMaxChars = {
  中堂: 50,
  条幅: 50,
  横幅: 50,
  对联: 50,
  扇面: 8,
};

const defaultCharsPerLine = {
  中堂: 8,
  条幅: 10,
  横幅: 12,
  对联: 7,
  扇面: 8,
};

const formatNotes = {
  中堂: "竖向大幅，适合厅堂、书房或展厅主墙，正文居中，四周留白充足。",
  条幅: "竖向窄幅，适合单独悬挂或成组展示，强调行气贯通和纵向节奏。",
  横幅: "横向展开，适合沙发背景墙、会议室或展览横墙，左右留白需要均衡。",
  对联: "左右两条成组展示，适合门厅、展馆入口或节庆陈设，重在上下联呼应。",
  扇面: "扇形小品，适合雅集、文创展示和收藏陈设，文字宜疏密有致。",
};

const presets = [
  { label: "褚楷雅句", text: "静以修身", script: "楷书", master: "褚遂良", format: "横幅" },
  { label: "曹碑横幅", text: "福寿康宁", script: "隶书", master: "曹全碑", format: "横幅" },
  { label: "铁线篆", text: "清风入怀", script: "篆书", master: "铁线篆", format: "条幅" },
];

const questionExamples = [
  "褚遂良楷书临摹时先看什么？",
  "曹全碑隶书的波磔怎么观察？",
  "铁线篆适合写什么内容？",
  "横幅作品落款和印章怎么安排？",
];

const scriptNotes = {
  楷书: "固定褚遂良，清劲秀逸，结体疏朗。",
  隶书: "固定曹全碑，扁方舒展，秀润古雅。",
  篆书: "固定铁线篆，线条匀细，圆转精严。",
};

const masterNotes = {
  褚遂良: "只用于楷书，强调清劲、灵动、疏朗。",
  曹全碑: "只用于隶书，强调秀润、波磔、横势。",
  铁线篆: "只用于篆书，强调匀净、圆转、修长。",
};

const defaultForm = {
  text: "厚德载物",
  script: "楷书",
  master: "褚遂良",
  format: "中堂",
  charsPerLine: 8,
};

export default function Home() {
  const [question, setQuestion] = useState("初学楷书应该怎样选择碑帖？");
  const [answer, setAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [artwork, setArtwork] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [works, setWorks] = useState([]);
  const [notice, setNotice] = useState("");

  const selectedSummary = useMemo(() => {
    return `${form.script} · ${form.master} · ${form.format}`;
  }, [form]);

  const maxChars = formatMaxChars[form.format] || 50;
  const maxCharsPerLine = Math.min(maxChars, 50);

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
      if (data.localMissingChars?.length > 0) {
        setNotice(`本地字库暂缺：${data.localMissingChars.join("、")}，已用系统字形补位。`);
      } else if (data.provider === "local-chusuiliang-kaishu") {
        setNotice("已使用褚遂良楷书本地字库集字生成。");
      } else if (data.provider === "local-caoquan-lishu") {
        setNotice("已使用曹全碑隶书本地字库集字生成。");
      } else if (data.provider === "local-tiexianzhuan") {
        setNotice("已使用铁线篆本地字库集字生成。");
      }
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

  function updateForm(field, value) {
    setForm((current) => {
      if (field === "script") {
        return { ...current, script: value, master: scriptMasterMap[value] };
      }
      if (field === "format") {
        const nextMax = formatMaxChars[value] || 50;
        return {
          ...current,
          format: value,
          text: Array.from(current.text || "").slice(0, nextMax).join(""),
          charsPerLine: Math.min(current.charsPerLine || defaultCharsPerLine[value] || nextMax, nextMax),
        };
      }
      if (field === "text") {
        return { ...current, text: Array.from(value || "").slice(0, formatMaxChars[current.format] || 50).join("") };
      }
      if (field === "charsPerLine") {
        const max = formatMaxChars[current.format] || 50;
        const number = Number.parseInt(value, 10);
        return { ...current, charsPerLine: Math.max(1, Math.min(Number.isFinite(number) ? number : 1, max)) };
      }
      return { ...current, [field]: value };
    });
  }

  function applyPreset(preset) {
    setForm({
      text: preset.text,
      script: preset.script,
      master: preset.master,
      format: preset.format,
      charsPerLine: defaultCharsPerLine[preset.format] || 8,
    });
    setArtwork(null);
  }

  function applyWork(work) {
    const script = scripts.includes(work.script) ? work.script : "楷书";
    const format = formats.includes(work.format) ? work.format : "中堂";
    setForm({
      text: work.inputText,
      script,
      master: scriptMasterMap[script],
      format,
      charsPerLine: defaultCharsPerLine[format] || 8,
    });
    setArtwork({ imageUrl: work.imageUrl, prompt: work.prompt });
  }

  return (
    <main>
      <section className="hero">
        <div className="heroInner">
          <div className="sealMark">墨</div>
          <div>
            <p className="eyebrow">碑帖问答 · 书体集字 · 章法预览</p>
            <h1>墨韵智创——书法生成艺术平台</h1>
            <p className="intro">面向书法爱好者和学习者，围绕碑帖知识、临摹方法、章法推敲与作品生成，提供一套可演示、可创作、可分享的数字书法工作台。</p>
            <div className="heroBadges" aria-label="平台能力">
              <span>碑帖知识问答</span>
              <span>固定经典书体</span>
              <span>原作高清预览</span>
            </div>
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

        <div className="grid single">
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
        </div>

        <article className="panel generator">
          <div className="panelTitle">
            <ImagePlus size={20} />
            <h2>书法作品生成</h2>
          </div>
          <form onSubmit={generateArtwork} className="generateForm">
            <label className="wide">
              生成文字
              <textarea className="compactText" value={form.text} onChange={(event) => updateForm("text", event.target.value)} maxLength={maxChars} />
              <small className="fieldHint">当前尺幅最多 {maxChars} 字。</small>
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
              <input value={form.master} readOnly />
            </label>
            <label>
              作品形式
              <select value={form.format} onChange={(event) => updateForm("format", event.target.value)}>
                {formats.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <small className="fieldHint">{formatNotes[form.format]}</small>
            </label>
            <label>
              每行字数
              <input
                type="number"
                min="1"
                max={maxCharsPerLine}
                value={form.charsPerLine}
                onChange={(event) => updateForm("charsPerLine", event.target.value)}
              />
              <small className="fieldHint">1-{maxCharsPerLine} 字。</small>
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
              <span>{formatNotes[form.format]} {quickLayout}</span>
            </div>
          </div>

          <div className="resultGrid">
            <ArtworkPreview
              artwork={artwork}
              generateLoading={generateLoading}
              selectedSummary={selectedSummary}
            />
            <div className="promptBox">
              <h3>作品说明</h3>
              <div className="metaGrid">
                <span>内容：{(artwork?.work?.inputText || form.text).replace("\n", " / ")}</span>
                <span>书体：{form.script}</span>
                <span>风格：{form.master}</span>
                <span>形式：{form.format}</span>
              </div>
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
                onClick={() => applyWork(work)}
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

function ArtworkPreview({ artwork, generateLoading, selectedSummary }) {
  if (generateLoading) {
    return (
      <div className="artPreview">
        <div className="generating">
          <Sparkles size={26} />
          <strong>正在研墨生成</strong>
          <span>图片模型需要数秒到几十秒，请稍候。</span>
        </div>
      </div>
    );
  }

  if (!artwork?.imageUrl) {
    return (
      <div className="artPreview">
        <div className="emptyArt">
          <span>墨</span>
          <p>{selectedSummary}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artPreview">
        <img src={artwork.imageUrl} alt="书法作品" />
    </div>
  );
}
