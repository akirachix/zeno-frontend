'use client';
import { useEffect, useRef, useState } from "react";
import Sidebar from "../sharedComponents/Sidebar";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "../sharedComponents/ChatInput";
import { RunFile, RunLike } from "../utils/types/chat"; 
import { Conversation } from "../utils/types/runs";
import { useConversationsWithRuns } from "../hooks/useConversationWithRuns";
import { useRuns } from "../hooks/useFetchPostRuns";
import { Hand } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [showGreeting, setShowGreeting] = useState(true);
  const [runLimitError, setRunLimitError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const id = localStorage.getItem('id');
    const role = localStorage.getItem('role');
    if (token && id && (role === 'User' || role === 'Admin')) {
      setToken(token);
      setUserId(parseInt(id, 10));
      setRole(role);
    } else {
      router.push('/signin');
    }
  }, [router]);

  const user = token && userId ? { id: userId, token } : undefined;
  const [conversationError, setConversationError] = useState<string | null>(null);
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    fetchConvos,
    setConversations,
  } = useConversationsWithRuns(token);

  const { runs, sendMessage, setRuns, clearRuns } = useRuns(user);

  const hasInitializedRuns = useRef(false);

  useEffect(() => {
    if (runs.length > 0) {
      setShowGreeting(false);
    }
  }, [runs]);

  useEffect(() => {
    if (selectedConversationId === null) {
      setRuns([]);
      setShowGreeting(true);
      hasInitializedRuns.current = false;
      return;
    }

    const selectedConversation = conversations.find(
      (conversation) => conversation.conversation_id === selectedConversationId
    );

    if (selectedConversation && selectedConversation.runs && !hasInitializedRuns.current) {
      const mappedRuns = selectedConversation.runs
        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()) 
        .map(run => ({
          id: String(run.id),
          user_input: run.user_input,
          final_output: run.final_output,
          output_artifacts: run.output_artifacts || [],
          status: run.status?.toLowerCase() || "completed",
          started_at: run.started_at,
          files: [],
          _optimistic: false,
        }));

      setRuns(mappedRuns);
      setShowGreeting(mappedRuns.length === 0);
      hasInitializedRuns.current = true; 
    }
  }, [selectedConversationId, conversations, setRuns]);

  useEffect(() => {
    return () => {
      hasInitializedRuns.current = false;
    };
  }, [selectedConversationId]);

  if (!user || (role !== 'User' && role !== 'Admin')) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="text-center">
        </div>
      </div>
    );
  }

  async function handleAddChat() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ user_id: userId, title: "New Chat" }),
    });

    let data: Conversation | null = null;
    try {
      data = await res.json();
    } catch {
    }

    if (!res.ok) {
      let errorMsg = "Failed to create conversation";
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string" &&
        data.error.includes("Daily conversation limit")
      ) {
        errorMsg = "You have run out of conversations for today. Try again tomorrow.";
      } else if (data && typeof data === "object" && "error" in data && data.error) {
        errorMsg = String(data.error);
      } else if (data && typeof data === "object" && "message" in data && data.message) {
        errorMsg = String(data.message);
      } else {
        errorMsg = "An unknown error occurred. Please try again later.";
      }
      setConversationError(errorMsg);
      return;
    }

    setConversations((prev) => [data!, ...prev]);
    setSelectedConversationId(data!.conversation_id);
    clearRuns(); 
    hasInitializedRuns.current = false;
  }

  async function handleRenameConversation(id: number, title: string) {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (res.ok) await fetchConvos();
  }

  async function handleDeleteConversation(id: number) {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Token ${token}` },
    });
    if (res.ok) {
      const updated = conversations.filter(c => c.conversation_id !== id);
      setConversations(updated);
      if (selectedConversationId === id) {
        if (updated.length > 0) {
          setSelectedConversationId(updated[0].conversation_id);
          clearRuns();
          hasInitializedRuns.current = false;
        } else {
          setSelectedConversationId(null);
          setRuns([]);
          setShowGreeting(true);
          hasInitializedRuns.current = false;
        }
      }
      await fetchConvos();
    }
  }

  async function handleSendMessage({
    conversationId,
    userInput,
    files,
    filePreviews,
  }: {
    conversationId?: string | null;
    userInput: string;
    files?: File[];
    filePreviews?: { file: File; previewUrl: string }[];
  }): Promise<RunLike> {
    let finalConversationId = conversationId;

    try {
      if (!finalConversationId) {
        const createRes = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ user_id: userId, title: "New Chat" }),
        });

        let convData: Conversation;
        try {
          convData = await createRes.json();
        } catch{
          throw new Error("Invalid response from server when creating conversation");
        }

        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          const errorMsg =
            (errorData?.error as string) ||
            (errorData?.message as string) ||
            "Failed to create conversation";
          throw new Error(errorMsg);
        }

        finalConversationId = String(convData.conversation_id);
        setConversations((prev) => [convData, ...prev]);
        setSelectedConversationId(convData.conversation_id);
        clearRuns(); 
        hasInitializedRuns.current = false;
      }

      setShowGreeting(false);

      const result = await sendMessage({
        conversationId: finalConversationId,
        userInput,
        files,
        filePreviews,
      });

      await fetchConvos();

      if (!conversationId) {
        const cleanInput = userInput.trim();
        if (cleanInput) {
          const words = cleanInput.split(/\s+/);
          const title = words.length > 5 ? words.slice(0, 5).join(' ') + '...' : cleanInput;
          await fetch(`/api/conversations/${finalConversationId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify({ title }),
          });
        }
      }

      setRunLimitError(false);
      return result;
    } catch (error) {
      let errorMsg = "Failed to send the message";
      let isRunLimit = false;

      if (error instanceof Error) {
        if (error.message.includes("Run limit")) {
          errorMsg = "You have reached the maximum number of runs for this conversation. Try to open another conversation.";
          isRunLimit = true;
        } else {
          errorMsg = error.message;
        }
      } else {
        errorMsg = "An unexpected error occurred.";
      }

      setConversationError(errorMsg);
      setRunLimitError(isRunLimit);
      throw error instanceof Error ? error : new Error(errorMsg);
    }
  }

  return (
    <div className="flex h-screen text-white ">
      <Sidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        setSelectedConversationId={setSelectedConversationId}
        onAddChat={handleAddChat}
        onLogout={() => {
          localStorage.clear();
          router.push('/signin'); 
        }}
        isMobile={false}
        showSidebar={true}
        setShowSidebar={() => {}}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        conversationError={conversationError}
        setConversationError={setConversationError}
      />
      <div className="flex-1 flex flex-col h-screen bg-transparent  ">
        <div className="flex flex-col gap-2 px-4 pt-4 pb-2 overflow-y-auto flex-1">
          {showGreeting ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-14">
                  <h1 className="text-5xl font-bold text-white">Hello there!</h1>
                  <Hand className="animate-waving text-cyan-400" size={64} strokeWidth={1.5} />
                </div>
                <p className="text-gray-300 text-2xl 2xl:text-5xl">How may I help you today?</p>
              </div>
            </div>
          ) : (
            <ChatMessages 
              runs={runs}
              onRetry={async (run) =>
                await handleSendMessage({
                  conversationId: selectedConversationId !== null ? String(selectedConversationId) : undefined,
                  userInput: run.user_input,
                  files: run.files?.map((f: RunFile) => f.file) || [],
                  filePreviews: run.files,
                })
              }
              userId={user.id}
              runLimitError={runLimitError}
              
            />
          )}
          <div ref={messagesEndRef} />
        </div>
        <ChatInput
          conversationId={selectedConversationId !== null ? String(selectedConversationId) : undefined}
          user={user}
          sendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}