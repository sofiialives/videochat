import { useEffect, useRef, useState } from "react";
import socket from "../../socket";
import { useNavigate } from "react-router-dom";
import { v4 } from "uuid";

export default function MainPage() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();
  const rootNode = useRef();

  useEffect(() => {
    socket.on("share-rooms", ({ rooms = [] } = {}) => {
      if (rootNode.current) {
        setRooms(rooms);
      }
    });
  }, []);

  return (
    <div ref={rootNode}>
      <h1 className="text-4xl">Available Rooms:</h1>
      <ul>
        {rooms.map((roomID) => (
          <li key={roomID}>
            {roomID}
            <button
              onClick={() => {
                navigate(`/room/${roomID}`);
              }}
            >
              Join Room
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          navigate(`/room/${v4()}`);
        }}
        className="py-3 px-2 bg-green-500 text-white rounded-lg mt-4"
      >
        Create Room
      </button>
    </div>
  );
}
