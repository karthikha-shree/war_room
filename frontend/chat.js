const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NzQ2OTZhYWZmZTc4N2FhNTZhMDViNCIsImlhdCI6MTc2OTYxNDk0NiwiZXhwIjoxNzcwMjE5NzQ2fQ.i1otzfmW7eXjN8-RPlKZhl7yKfTSMwogNTjTLt61CnA";
const BOARD_ID = "6974e443ad6c543b2a216c7d";

const socket = io("http://localhost:5000", {
  auth: {
    token: TOKEN,
  },
});

socket.on("connect", () => {
  console.log("✅ Connected to socket");
  socket.emit("joinBoard", { boardId: BOARD_ID });
});

socket.on("joinedBoard", (boardId) => {
  console.log("📌 Joined board:", boardId);
});

socket.on("newMessage", (msg) => {
  const li = document.createElement("li");
  li.innerText = `${msg.user.name}: ${msg.text}`;
  document.getElementById("messages").appendChild(li);
});

function send() {
  const input = document.getElementById("msg");
  socket.emit("sendMessage", {
    boardId: BOARD_ID,
    text: input.value,
  });
  input.value = "";
}
