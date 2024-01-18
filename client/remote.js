var serverString = "wss://websocket-90ug.onrender.com"
//'ws://4.tcp.ngrok.io:16530'
//'wss://0d4c-2401-7000-dbed-9401-4bc-3dfc-5e07-b1bc.ngrok-free.app'
//'ws://localhost:3000';  

var mediaConstraints = {'mandatory': {'OfferToReceiveVideo':true}};

const remoteVideo = document.getElementById('remoteVideo');
const webcamVideo = document.getElementById('webcamVideo');
const myid = document.getElementById('myname');
const targetid = document.getElementById('targetname');
const callbutton = document.getElementById('callid');

let remoteDS = null;
let localSD = null;
var candidates = [];

//let remoteStream = null;
let localStream = null;
let dataChannel = null;

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


// // Pull tracks from remote stream, add to video stream
// pc.ontrack = (event) => {

// 	remoteVideo.srcObject = event.streams[0];

// 	event.streams[0].getTracks().forEach((track) => {
// 	  console.log(track.id);
// 	  remoteStream.addTrack(track);
// 	});	

// //remoteVideo.srcObject = remoteStream;
// };


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

	// var data = {
	// 	type: 'IceCandidates',
	// 	username: myid.value,
	// 	target: targetid.value,
	// 	data: JSON.stringify(ff)
	// };

	socket.send(JSON.stringify({'data': JSON.stringify(ff), 'type': "IceCandidates", 'username': myid.value, 'target': targetid.value}));

	/*if (remoteDS != null)
	{
		var rtcIceCandidate = new RTCIceCandidate(event.candidate)	
    	pc.addIceCandidate(rtcIceCandidate);

    	console.log("got it adding" + event.candidate);
	}
	else
		candidates.push(event.candidate);*/

	//console.log(JSON.stringify({'data': JSON.stringify(ff), 'type': "IceCandidates", 'username': myid.value, 'target': targetid.value}));
};

//remoteStream = new MediaStream();

callbutton.onclick = async () => {

	var calld = {
		type: 'Offer',
		username: myid.value,
		target: targetid.value		
	};

	call (calld)
};


webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true });
  

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
  	
    event.streams[0].getTracks().forEach((track) => {
      //remoteStream.addTrack(track);
      remoteVideo.srcObject = event.streams[0];
    });

    remoteVideo.autoplay = true;
	remoteVideo.playsInline = true;
	remoteVideo.muted = true;
  };

    webcamVideo.srcObject = localStream;


	var signinData = {
		type: 'SignIn',
		username: myid.value,
		data: { message: 'Signing in' }
	};

	socket.send(JSON.stringify(signinData));
};



// Event handler for when the connection is established
socket.addEventListener('open', (event) => {
	//console.log('WebSocket connection is open.');
});

// Event handler for receiving messages from the server
socket.addEventListener('message', (event) => {
	console.log('Received from server:', event);
	var message = JSON.parse(event.data);


	switch (message.type) {
		case "StartStreaming":
			call(message);		
			break;
		case "EndCall":
		// Code to execute if expression matches caseValue2
		break;
		case "Offer":
			offer(message);
            
		break;
		case "Answer":
		    var remoteDescription = message.data;
			
	        var rtcSessionDescription = new RTCSessionDescription({
		        type: 'answer', // or 'offer' depending on the message type
		        sdp: remoteDescription
		    });


    		remoteDS = remoteDescription;
		    pc.setRemoteDescription(rtcSessionDescription);

			candidates.forEach((candidate) => {
		  		var rtcIceCandidate = new RTCIceCandidate(event.candidate)	
    			pc.addIceCandidate(rtcIceCandidate);
			});

			candidates = [];

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


async function offer(message)
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

	localSD = answerDescription.sdp; 
}

async function call(body) {

	if (localSD != null)
		return;

 	var offerDescription = await pc.createOffer();
  	await pc.setLocalDescription(offerDescription);

  	var oo = JSON.stringify({
	                "target": body.username,
	                "username": body.target,
	                "type": "Offer",
	                "data": offerDescription.sdp
	          });
	socket.send(oo);

	localSD = offerDescription.sdp;

}


