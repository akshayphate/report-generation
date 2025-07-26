//index.tsx
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
// import { Protected } from '@ctip/cip-framework-client';
import RestrictAccess from '../components/RestrictAccess';


export default function Home() {
  const router = useRouter();
  const roles = ['tprss-inquire'];


  const navigateTo = (path: string) => {
    router.push(path);
  };


  return (
    // <Protected withRole={roles} Denied={() => <RestrictAccess />}>
      <div className={styles.container}>
        <main className={styles.main}>


          <div className={styles.messageContainer}>
            <div>
              <div className={styles.headMessage}>Objective:</div>
              <div className={styles.message}>
                Third Party Risk Summarization Service will provide AI driven evaluations which will help assessors in validating vendors provided evidence
                against various controls. It supports individual control-based evaluation as well as full vendor assessment and will significantly reduce the time taken
                for an assessor to complete the vendor assessments.
              </div>
            </div>
            <div className={styles.centeredContainer}>
              <div className={styles.headMessage}>AI Responsibility Warning:</div>
              <div className={styles.message}>
                <strong>Disclaimer:</strong>:This platform incorporates Generative Artificial Intelligence (AI) to enhance the efficiency and analytical capabilities of vendor
                assessment process. Responses are highly effective but do not offer absolute guarantees or infallibility. The accuracy and relevance of AI-driven insights are directly dependent on the quality and completeness of the data you provide. AI models are based on patterns and probabilities so, your final assessment decisions should always be based on a comprehensive review of all available information, combining AI-driven insights with your expertise and professional judgement.
              </div>
            </div>
          </div>


          <div className={styles.optionsContainer}>
            <div
              className={styles.optionCard}
              onClick={() => navigateTo('/assess')}
            >
              <h2>Full Vendor Assessment</h2>
              <p>Perform a comprehensive vendor assessment.</p>
            </div>


            <div
              className={styles.optionCard}
              onClick={() => navigateTo('/chat')}
            >
              <h2>Chat Based Assessment</h2>
              <p>Interact with our AI for control level assessment.</p>
            </div>
          </div>
        </main>
      </div>
  );
}