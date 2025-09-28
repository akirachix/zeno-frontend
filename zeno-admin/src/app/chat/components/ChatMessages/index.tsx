// "use client";

// import { useEffect, useRef } from "react";
// import UserMessage from "./components/UserMessageCard";
// import AgentMessage from "./components/AgentMessageCard";
// import FeedbackButtons from "../FeedbackButtons";
// import ChatArtifactRenderer from "./components/ArtifactRender";
// import type { ChatMessagesProps, RunLike, RunFile } from "../../../utils/types/chat";
// export default function ChatMessages({
//   runs,
//   onRetry,
//   userId,
// }: ChatMessagesProps) {
//   const bottomRef = useRef<HTMLDivElement | null>(null);

//   useEffect(() => {
//     if (bottomRef.current) {
//       bottomRef.current.scrollIntoView({ behavior: "smooth" });
//     }
//   }, [runs]);

//   return (
//     <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full xl:max-w-3xl lg:max-w-2xl md:max-w-xl mx-auto scrollbar-hide">
//       {runs.map((run: Run) => (
//         <div key={run.id} className="">
//           <UserMessage
//             text={run.user_input}
//             files={
//               run.files
//                 ? run.files.map((file) =>
//                     typeof file === "object" &&
//                     "file" in file &&
//                     "previewUrl" in file
//                       ? (file as RunFile)
//                       : { file, previewUrl: "" }
//                   )
//                 : undefined
//             }
//           />

//           {run.status === "pending" && <AgentMessage loading />}

//           {run.status === "completed" && (
//             <>
//               {run.final_output && <AgentMessage text={run.final_output} />}

//               {Array.isArray(run.output_artifacts) &&
//                 run.output_artifacts.length > 0 &&
//                 run.output_artifacts.map((artifact, idx) => (
//                   <ChatArtifactRenderer
//                     key={artifact.id ?? idx}
//                     artifactType={artifact.artifact_type}
//                     artifactData={artifact.data}
//                     text={artifact.title}
//                   />
//                 ))}

//               {!run.final_output &&
//                 (!Array.isArray(run.output_artifacts) ||
//                   run.output_artifacts.length === 0) && (
//                   <AgentMessage text="No response generated." />
//                 )}

//               <div className="flex">
//                 <FeedbackButtons
//                   userId={userId ?? 0}
//                   textToCopy={run.final_output || ""}
//                 />
//               </div>
//             </>
//           )}

//           {run.status === "failed" && (
//             <div className="flex items-center gap-2 ml-10">
//               <span className="text-red-500">Failed to send</span>
//               {onRetry && (
//                 <button
//                   onClick={() => onRetry(run)}
//                   className="text-blue-400 underline"
//                 >
//                   Retry
//                 </button>
//               )}
//             </div>
//           )}
//         </div>
//       ))}
//       <div ref={bottomRef} />
//     </div>
//   );
// }
"use client";

import { useEffect, useRef } from "react";
import UserMessage from "./components/UserMessageCard";
import AgentMessage from "./components/AgentMessageCard";
import FeedbackButtons from "../FeedbackButtons";
import ChatArtifactRenderer from "./components/ArtifactRender";
import type { ChatMessagesProps, RunLike, RunFile } from "../../../utils/types/chat";

export default function ChatMessages({
  runs,
  onRetry,
  userId,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [runs]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full xl:max-w-3xl lg:max-w-2xl md:max-w-xl mx-auto scrollbar-hide">
      {runs.map((run: RunLike) => (
        <div key={run.id} className="">
          <UserMessage
            text={run.user_input}
            files={
              run.files
                ? run.files.map((file) =>
                    typeof file === "object" &&
                    "file" in file &&
                    "previewUrl" in file
                      ? (file as RunFile)
                      : { file, previewUrl: "" }
                  )
                : undefined
            }
          />

          {run.status === "pending" && <AgentMessage loading />}

          {run.status === "completed" && (
            <>
              {run.final_output && <AgentMessage text={run.final_output} />}

              {Array.isArray(run.output_artifacts) &&
                run.output_artifacts.length > 0 &&
                run.output_artifacts.map((artifact, idx) => (
                  <ChatArtifactRenderer
                    key={artifact.id ?? idx}
                    artifactType={artifact.artifact_type}
                    artifactData={artifact.data}
                    text={artifact.title}
                  />
                ))}

              {!run.final_output &&
                (!Array.isArray(run.output_artifacts) ||
                  run.output_artifacts.length === 0) && (
                  <AgentMessage text="No response generated." />
                )}

              <div className="flex">
                <FeedbackButtons
                  userId={userId ?? 0}
                  textToCopy={run.final_output || ""}
                />
              </div>
            </>
          )}

          {run.status === "failed" && (
            <div className="flex items-center gap-2 ml-10">
              <span className="text-red-500">Failed to send</span>
              {onRetry && (
                <button
                  onClick={() => onRetry(run)}
                  className="text-blue-400 underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}