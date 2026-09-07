import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  // --- Generate persistent user_id ---
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  const [userId] = useState(() => generateUUID());

  // Pomodoro state
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const [task, setTask] = useState("");
  const [rewards, setRewards] = useState([]);
  const [isEnded, setIsEnded] = useState(false);

  const chatBoxRef = useRef(null);

  const addReward = () => {
    if (task.trim() !== "") {
      setRewards([...rewards, task]);
      setTask("");
    }
  };

  // Countdown logic
  useEffect(() => {
    let timer;

    if (isRunning && time > 0) {
      timer = setInterval(() => {
        setTime((t) => t - 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isRunning, time]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTime(25 * 60);
  };

  // Format time (MM:SS)
  const formatTime = (t) => {
    const m = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");

    const s = (t % 60).toString().padStart(2, "0");

    return `${m}:${s}`;
  };

  // --- Initial message ---
  const initialMessage =
    "Hi! I’m ProactiMate, your motivational chatbot. My goal is to help you reflect on your procrastination habits and work towards overcoming them. I won’t give specific advice but will guide you to clarify your goals. What aspect of procrastination would you like to focus on today?";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: initialMessage,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // --- Send message to backend ---
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          message: input,
        }),
      });

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Farewell message
      if (data.farewell) {
        const farewellMessage = {
          role: "assistant",
          content: data.farewell,
        };

        setMessages((prev) => [...prev, farewellMessage]);
        setIsEnded(true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Enter key ---
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="center-layout">

      {/* Chat Interface */}
      <div className="app-container">
        <h1>🕒 ProactiMate</h1>

        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-row ${
                msg.role === "user" ? "user" : "assistant"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="avatar">🤖</div>
              )}

              <div className={`message ${msg.role}`}>
                <b>
                  {msg.role === "user" ? "You" : "ProactiMate"}:
                </b>{" "}
                {msg.content}
              </div>

              {msg.role === "user" && (
                <div className="avatar">🧑</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="avatar">🤖</div>
              <div className="message assistant">
                Typing...
              </div>
            </div>
          )}
        </div>

        <div className="input-box">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={isEnded}
          />

          <button
            onClick={sendMessage}
            disabled={isEnded || loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
