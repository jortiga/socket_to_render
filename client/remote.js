var serverString = 'ws://localhost:3000'
//"wss://websocket-90ug.onrender.com"
//'ws://4.tcp.ngrok.io:16530'
//'wss://0d4c-2401-7000-dbed-9401-4bc-3dfc-5e07-b1bc.ngrok-free.app'
//'ws://localhost:3000';  

var mediaConstraints = {'mandatory': {'OfferToReceiveVideo':true}};

const remoteVideo = document.getElementById('remoteVideo');
const webcamVideo = document.getElementById('webcamVideo');

const myid = document.getElementById('myname');
myid.hidden = true;

const requestCallId = document.getElementById('requestCallId');
const requestButton = document.getElementById('requestButton');

const shareCallId = document.getElementById('shareCallId');
const shareButton = document.getElementById('shareButton');

let remoteDS = null;
let localSD = null;
var candidates = [];

//let remoteStream = null;
let localStream = null;
let dataChannel = null;

let localUsername;
let localTargetName;

const socket = new WebSocket(serverString);
var pc = new RTCPeerConnection({
  sdpSemantics: 'unified-plan',
  iceServers: [
    {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "abc@gmail.com",
        credential: "98376683"
    },
    {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "abc@gmail.com",
        credential: "98376683"
    }
  ]});

// Create data channel
dataChannel = pc.createDataChannel('foobar')

dataChannel.onmessage = function (event) { 
  console.log("Got message:", event.data); 
}; 

// Create a audio or video transceiver
pc.addTransceiver('video')

pc.onicecandidate  = (event) => {

	if(event.candidate == null) 
		return;

	var ff =
	{
		adapterType: "UNKNOWN",
		sdp: event.candidate.candidate,
		sdpMLineIndex: event.candidate.sdpMLineIndex,
		sdpMid: event.candidate.sdpMid,
		usernameFragment: event.candidate.usernameFragment,
		candidate: event.candidate.candidate,
		serverUrl: ""
	}

	var out = JSON.stringify({'data': JSON.stringify(ff), 'type': "IceCandidates", 'username': myid.value, 'target': localTargetName});
	socket.send(out);
};

window.onload = async function() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true });
  
    // Push tracks from local stream to peer connection
	  localStream.getTracks().forEach((track) => {
	    pc.addTrack(track, localStream);
	  });

 	webcamVideo.srcObject = localStream;

	// Pull tracks from remote stream, add to video stream
	// pc.ontrack = (event) => {
	// 	event.streams.forEach(str => {
	// 		str.getTracks().forEach((track) => {
	// 		//remoteStream.addTrack(track);
	// 		remoteVideo.srcObject = str;
	// 	})});
	// };

	pc.ontrack = (event) => {

		event.streams[0].getTracks().forEach((track) => {
		//remoteStream.addTrack(track);
			remoteVideo.srcObject = event.streams[0];
		});

		remoteVideo.autoplay = true;
		remoteVideo.playsInline = true;
		remoteVideo.muted = true;
	};

	const labelContainer = document.getElementById('labelContainer');

	// Create a new label element
	const labelElement = document.createElement('label');

	// Set the label's text content based on a value from JavaScript
	const labelText = generateRandomAlphanumeric(2); // Replace with your desired label text
	labelElement.textContent = labelText;
	myid.value = labelText;

	localUsername = myid.value;
	// Append the label to the container
	labelContainer.appendChild(labelElement);
};


shareButton.onclick = async () => {

	var calld = {
		username: myid.value,
		target: shareCallId.value		
	};

	localTargetName = shareCallId.value;
	call (calld)
};

requestButton.onclick = async () => {

	var calld = {
		type: 'StartStreaming',
		username: myid.value,
		target: requestCallId.value		
	};

	localTargetName = requestCallId.value;
	var oo = JSON.stringify(calld);
	socket.send(oo);
};

// Event handler for when the connection is established
socket.addEventListener('open', (event) => {
	console.log('Signing In ' + myid.value);

	var signinData = {
		type: 'SignIn',
		username: myid.value,
		data: { message: 'Signing in' }
	};

	socket.send(JSON.stringify(signinData));
});

// Event handler for receiving messages from the server
socket.addEventListener('message', (event) => {
	console.log('Received from server:', event);
	var message = JSON.parse(event.data);

	switch (message.type) {
		case "StartStreaming":
			localTargetName = message.username;
			var calld = {				
				username: myid.value,
				target: message.username		
			};
			call(calld);		
			break;
		case "EndCall":
		// Code to execute if expression matches caseValue2
		break;
		case "Offer":
			OnReceiveOffer(message);            
		break;
		case "Answer":
		    OnReceiveAnswer(message)
		break;
		case "IceCandidates":
			var candidateData = JSON.parse(message.data);
		
			var rtcIceCandidate = new RTCIceCandidate(candidateData)	
		    pc.addIceCandidate(rtcIceCandidate);
		break;
		// More cases can be added as needed
		default:
		// Code to execute if no case matches the expression
	}

});

// Event handler for handling errors
socket.addEventListener('error', (event) => {
	
});

// Event handler for when the connection is closed
socket.addEventListener('close', (event) => {
	if (event.wasClean) {
		console.log(`WebSocket connection closed cleanly, code=${event.code}, reason=${event.reason}`);
	} else {
		console.error('WebSocket connection abruptly closed');
	}
});


async function OnReceiveAnswer(message)
{
	var remoteDescription = message.data;
			
    var rtcSessionDescription = new RTCSessionDescription({
        type: 'answer', // or 'offer' depending on the message type
        sdp: remoteDescription
    });

	remoteDS = remoteDescription;

    await pc.setRemoteDescription(rtcSessionDescription);

	candidates.forEach((candidate) => {
  		var rtcIceCandidate = new RTCIceCandidate(event.candidate)	
		pc.addIceCandidate(rtcIceCandidate);
	});

	candidates = [];

	console.log((localSD == null) + " " + (remoteDS == null))

}
async function OnReceiveOffer(message)
{
    var remoteDescription = message.data;
	
    var rtcSessionDescription = new RTCSessionDescription({
        type: 'offer', // or 'offer' depending on the message type
        sdp: remoteDescription
    });

    pc.setRemoteDescription(rtcSessionDescription);
    remoteDS = remoteDescription;

	var answerDescription = await pc.createAnswer();
	await pc.setLocalDescription(answerDescription);

	var rr = JSON.stringify({
	                "target": message.username,
	                "username": message.target,
	                "type": "Answer",
	                "data": answerDescription.sdp
	          });
	socket.send(rr);

	console.log(rr);
	localSD = answerDescription.sdp; 

	candidates.forEach((candidate) => {
  		var rtcIceCandidate = new RTCIceCandidate(event.candidate)	
		pc.addIceCandidate(rtcIceCandidate);
	});

	console.log((localSD == null) + " " + (remoteDS == null))
	candidates = [];
}

async function call(body) {

	if (localSD != null)
		return;
	
 	var offerDescription = await pc.createOffer();
  	await pc.setLocalDescription(offerDescription);

  	var oo = JSON.stringify({
	                "target": body.target,
	                "username": body.username,
	                "type": "Offer",
	                "data": offerDescription.sdp
	          });
	socket.send(oo);

	console.log(body);
	localSD = offerDescription.sdp;

}

function generateRandomAlphanumeric(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength);
    result += charset.charAt(randomIndex);
  }

  return result;
}