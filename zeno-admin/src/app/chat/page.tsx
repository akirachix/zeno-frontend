'use client';
import { useEffect, useRef, useState } from "react";
import Sidebar from "../sharedComponents/Sidebar";
import ChatMessages from "./components/ChatMessages";
import ChatInput from "../sharedComponents/ChatInput";
import { RunFile, RunLike } from "../utils/types/chat";
import { useConversationsWithRuns } from "../hooks/useConversationWithRuns";
import { useRuns } from "../hooks/useFetchPostRuns";
import { Hand } from "lucide-react"; 

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [showGreeting, setShowGreeting] = useState(true); 

  useEffect(() => {
    const t = localStorage.getItem('token');
    const id = localStorage.getItem('id');
    if (t && id) {
      setToken(t);
      setUserId(parseInt(id, 10));
    }
  }, []);

  const user = token && userId ? { id: userId, token } : undefined;

  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    fetchConvos,
    setConversations,
  } = useConversationsWithRuns(token);

  const { runs, sendMessage, setRuns } = useRuns(user);

  useEffect(() => {
    if (runs.length > 0) {
      setShowGreeting(false);
    }
  }, [runs]);

  useEffect(() => {
    const selectedConversation = conversations.find(
      (c) => c.conversation_id === selectedConversationId
    );
    if (selectedConversation && selectedConversation.runs) {
      const mappedRuns = selectedConversation.runs.map(run => ({
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
    } else {
      setRuns([]);
      setShowGreeting(true); 
    }
  }, [selectedConversationId, conversations, setRuns]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [runs]);

  if (!user) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  async function handleAddChat() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ user_id: userId, title: "New Chat" }),
    });
    if (!res.ok) {
      alert("Failed to create conversation");
      return;
    }
    const data = await res.json();
    setConversations(prev => [data, ...prev]);
    setSelectedConversationId(data.conversation_id);
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
        } else {
          setSelectedConversationId(null);
          setRuns([]);
          setShowGreeting(true);
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

    if (!finalConversationId) {
      const createRes = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ user_id: userId, title: "New Chat" }),
      });
      const convData = await createRes.json();
      finalConversationId = convData.conversation_id;
      setConversations(prev => [convData, ...prev]);
      setSelectedConversationId(convData.conversation_id);
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

    return result;
  }

  return (
    <div className="flex h-screen text-white">
      <Sidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        setSelectedConversationId={setSelectedConversationId}
        onAddChat={handleAddChat}
        onLogout={() => {
          localStorage.clear();
          window.location.href = "/signin";
        }}
        isMobile={false}
        showSidebar={true}
        setShowSidebar={() => {}}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 flex flex-col h-screen bg-transparent">
        <div className="flex flex-col gap-2 px-4 pt-4 pb-2 overflow-y-auto flex-1">
          {showGreeting ? (
             <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-14">
                  <h1 className="text-5xl font-bold text-white ">Hello there!</h1>
                  <Hand className=" animate-waving text-cyan-400" size={64} strokeWidth={1.5} />
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
