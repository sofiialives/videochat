import { useCallback, useEffect, useRef } from "react";
import useStateWithCallback from "./useStateWithCallback";
import socket from "../socket";
import freeice from "freeice";

export const LOCAL_VIDEO = "LOCAL_VIDEO";

export function useWebRTC(roomID) {
  const [clients, setClients] = useStateWithCallback([]);

  const addNewClient = useCallback(
    (newClient, cb) => {
      if (!clients.includes(newClient)) {
        setClients((list) => [...list, newClient], cb);
      }
    },
    [clients, setClients]
  );

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      if (peerID in peerConnections.current) {
        return console.warn(`Already connected to peer ${peerID}`);
      }

      peerConnections.current[peerID] = new RTCPeerConnection({
        iceServers: freeice(),
      });

      peerConnections.current[peerID].onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("relay-ice", {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;
      peerConnections.current[peerID].ontrack = ({
        streams: [remoteStream],
      }) => {
        tracksNumber++;

        if (tracksNumber === 2) {
          // waiting for the video and audio
          addNewClient(peerID, () => {
            peerMediaElements.current[peerID].srcObject = remoteStream;
          });
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        peerConnections.current[peerID].addTrack(
          track,
          localMediaStream.current
        );
      });

      if (createOffer) {
        const offer = await peerConnections.current[peerID].createOffer();

        await peerConnections.current[peerID].setLocalDescription(offer);

        socket.emit("relay-sdp", {
          peerID,
          sessionDescription: offer,
        });
      }
    }

    socket.on("add-peer", handleNewPeer);
  }, [addNewClient]);

  useEffect(() => {
    async function setRemoteMedia({
      peerID,
      sessionDescription: remoteDescription,
    }) {
      await peerConnections.current[peerID].setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );
      if (remoteDescription.type === "offer") {
        const answer = await peerConnections.current[peerID].createAnswer();

        await peerConnections.current[peerID].setLocalDescription(answer);

        socket.emit("relay-sdp", {
          peerID,
          sessionDescription: answer,
        });
      }
    }
    socket.on("session-description", setRemoteMedia);
  }, []);

  useEffect(() => {
    socket.on("ice-candidate", ({ peerID, iceCandidate }) => {
      peerConnections.current[peerID].addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });
  }, []);

  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
      }

      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];

      setClients((list) => list.filter((client) => client !== peerID));
    };
    socket.on("remove-peer", handleRemovePeer);
  }, [setClients]);

  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });
      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });
    }

    startCapture()
      .then(() => socket.emit("join", { room: roomID }))
      .catch((e) => console.log("Error getting userMedia", e));

    return () => {
      localMediaStream.current?.getTracks().forEach((track) => track.stop());
      socket.emit("leave");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomID]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
}
