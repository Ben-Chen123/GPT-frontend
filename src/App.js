import React, { useState, useEffect } from "react";
import { useRef} from "react";
import "./App.css";

function App() {
  // --- Generate or retrieve persistent user_id ---
  const [userId] = useState(() => {
    const saved = localStorage.getItem("user_id");
    if (saved) return saved;
    const newId = crypto.randomUUID(); // generate unique id
    localStorage.setItem("user_id", newId);
    return newId;
  });
  
  const [stage, setStage] = useState("Engaging and Focusing");
  // Pomodoro state
  const [time, setTime] = useState(25 * 60); // 25 min
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState("");
  const [rewards, setRewards] = useState([]);
  const [isEnded, setIsEnded] = useState(false);
  const chatEndRef = useRef(null);
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
      timer = setInterval(() => setTime((t) => t - 1), 1000);
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

  // --- Initial message (displayed only once) ---
  const initialMessage =
    "Hi! I’m ProactiMate, your motivational chatbot. My goal is to help you reflect on your procrastination habits and work towards overcoming them. I won’t give specific advice but will guide you to clarify your goals. What aspect of procrastination would you like to focus on today?";

  const [messages, setMessages] = useState([
    { role: "assistant", content: initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);
  // --- Send message to backend ---
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId, // ✅ send user_id
          message: input,
        }),
      });
      const data = await response.json();
      const assistantMessage = { role: "assistant", content: data.response };

      // ✅ Append chatbot reply
      setMessages((prev) => [...prev, assistantMessage]);
      if (data.stage) setStage(data.stage);

      // ✅ If farewell message is returned
      if (data.farewell) {
        const farewellMessage = { role: "assistant", content: data.farewell };
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
    if (e.key === "Enter") sendMessage();
  };
  return (
    <div className="center-layout">
      {/* Progress Bar Section */}
      <div className="progress-bar-container">
        <div className="progress-labels">
          <span className={stage === "Engaging and Focusing" ? "active" : ""}>
            Engaging & Focusing
          </span>
          <span className={stage === "Evoking" ? "active" : ""}>Evoking</span>
          <span className={stage === "Planning" ? "active" : ""}>Planning</span>
        </div>
  
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width:
                stage === "Engaging and Focusing"
                  ? "33%"
                  : stage === "Evoking"
                  ? "66%"
                  : "100%",
            }}
          ></div>
        </div>
      </div>
  
      {/* Chat Interface Section */}
      <div className="app-container">
        <h1>🕒 ProactiMate</h1>
  
        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-row ${msg.role === "user" ? "user" : "assistant"}`}
            >
              {msg.role === "assistant" && <div className="avatar">🤖</div>}
              <div className={`message ${msg.role}`}>
                <b>{msg.role === "user" ? "You" : "ProactiMate"}:</b> {msg.content}
              </div>
              {msg.role === "user" && <div className="avatar">🧑</div>}
            </div>
          ))}
  
          {loading && (
            <div className="message-row assistant">
              <div className="avatar">🤖</div>
              <div className="message assistant">Typing...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
  
        <div className="input-box">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            disabled={isEnded}     // 🔴 disable input
          />
  
          <button onClick={sendMessage} disabled={isEnded || loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
  
   

}    

export default App;
