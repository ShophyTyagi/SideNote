import Link from 'next/link'
import Header from '@/components/Header'
import styles from './page.module.css'

export const metadata = {
  title: 'About — SideNote',
}

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.inner}>
          <Link href="/" className={styles.back}>← Back</Link>

          {/* Masthead */}
          <div className={styles.hero}>
            <p className={styles.kicker}>How it works</p>
            <h1 className={styles.heroTitle}>Grounded answers from your documents.</h1>
            <p className={styles.heroSub}>
              Document Q&A uses retrieval-augmented generation to answer questions
              strictly from the files you upload. Every answer is tied to a source.
            </p>
          </div>

          <div className={styles.rule} aria-hidden="true" />

          {/* Steps */}
          <section className={styles.section} aria-labelledby="steps-heading">
            <h2 className={styles.sectionTitle} id="steps-heading">The pipeline</h2>
            <ol className={styles.steps}>
              {[
                {
                  n: '01',
                  label: 'Upload',
                  body: 'Your PDF, TXT, or Markdown files are read and split into overlapping chunks of ~800 tokens with a 120-token overlap to preserve context across boundaries.',
                },
                {
                  n: '02',
                  label: 'Index',
                  body: 'Each chunk is embedded using the all-MiniLM-L6-v2 sentence-transformer model and stored in a local ChromaDB vector database.',
                },
                {
                  n: '03',
                  label: 'Retrieve',
                  body: 'When you ask a question it is embedded with the same model. The top 10 most similar chunks are retrieved by cosine similarity.',
                },
                {
                  n: '04',
                  label: 'Generate',
                  body: 'Claude receives the retrieved chunks as context and generates an answer with inline citations. If the answer cannot be grounded, it says so.',
                },
              ].map((step) => (
                <li key={step.n} className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">
                    {step.n}
                  </span>
                  <div>
                    <h3 className={styles.stepLabel}>{step.label}</h3>
                    <p className={styles.stepBody}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.rule} aria-hidden="true" />

          {/* Architecture diagram */}
          <section className={styles.section} aria-labelledby="arch-heading">
            <h2 className={styles.sectionTitle} id="arch-heading">Architecture</h2>
            <div className={styles.diagram} aria-label="Architecture diagram">
              <div className={styles.diagRow}>
                <div className={styles.diagBox}>Files</div>
                <span className={styles.diagArrow}>→</span>
                <div className={styles.diagBox}>Chunker</div>
                <span className={styles.diagArrow}>→</span>
                <div className={styles.diagBox}>Embedder</div>
                <span className={styles.diagArrow}>→</span>
                <div className={`${styles.diagBox} ${styles.diagStore}`}>ChromaDB</div>
              </div>
              <div className={styles.diagConnector} aria-hidden="true" />
              <div className={styles.diagRow}>
                <div className={styles.diagBox}>Question</div>
                <span className={styles.diagArrow}>→</span>
                <div className={styles.diagBox}>Embedder</div>
                <span className={styles.diagArrow}>→</span>
                <div className={styles.diagBox}>Retriever</div>
                <span className={styles.diagArrow}>→</span>
                <div className={`${styles.diagBox} ${styles.diagModel}`}>Claude API</div>
              </div>
              <div className={styles.diagConnector} aria-hidden="true" />
              <div className={styles.diagRow}>
                <div className={`${styles.diagBox} ${styles.diagOutput}`}>Answer + Citations</div>
              </div>
            </div>
          </section>

          <div className={styles.rule} aria-hidden="true" />

          {/* Limitations */}
          <section className={styles.section} aria-labelledby="limits-heading">
            <h2 className={styles.sectionTitle} id="limits-heading">Limitations</h2>
            <ul className={styles.limitList}>
              {[
                {
                  label: 'Text-based PDFs only.',
                  body: 'Scanned or image PDFs cannot be indexed — the extractor reads character data, not pixels.',
                },
                {
                  label: 'Fixed context window.',
                  body: 'Only the top 10 retrieved chunks are sent to Claude. For very long documents, some relevant sections may not surface.',
                },
                {
                  label: 'Model hallucination.',
                  body: 'Claude attempts to stay grounded but can still make errors. Verify important claims against the original documents.',
                },
                {
                  label: 'Local storage.',
                  body: 'Documents and embeddings are stored on the server filesystem. No persistence across environments without migration.',
                },
              ].map((item) => (
                <li key={item.label} className={styles.limitItem}>
                  <span className={styles.limitLabel}>{item.label}</span>{' '}
                  {item.body}
                </li>
              ))}
            </ul>
          </section>

          <div className={styles.rule} aria-hidden="true" />

          {/* Stack */}
          <section className={styles.section} aria-labelledby="stack-heading">
            <h2 className={styles.sectionTitle} id="stack-heading">Technical stack</h2>
            <dl className={styles.stackGrid}>
              {[
                { term: 'Embeddings', def: 'all-MiniLM-L6-v2 via HuggingFace' },
                { term: 'Vector store', def: 'ChromaDB (local persistence)' },
                { term: 'Generation', def: 'Claude Opus 4.5 via Anthropic API' },
                { term: 'Chunking', def: '800 tokens, 120 token overlap' },
                { term: 'Framework', def: 'FastAPI + Next.js 15' },
                { term: 'File types', def: 'PDF, TXT, Markdown' },
              ].map((item) => (
                <div key={item.term} className={styles.stackItem}>
                  <dt className={styles.stackTerm}>{item.term}</dt>
                  <dd className={styles.stackDef}>{item.def}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </>
  )
}
