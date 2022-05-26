import h from './helpers.js';

window.addEventListener('load', () => {
    const room = h.getQString(location.href, 'room');
    const username = sessionStorage.getItem('username');
    // console.log('room', room);
    if (!room) {
        document.querySelector('#room-create').attributes.removeNamedItem('hidden');
    }

    else if (!username) {
        document.querySelector('#username-set').attributes.removeNamedItem('hidden');
    }

    else {
        
        var status = sessionStorage.getItem('status');
        let commElem = document.getElementsByClassName('room-comm');
        document.querySelector('#member').attributes.removeNamedItem('hidden');

        for (let i = 0; i < commElem.length; i++) {
            commElem[i].attributes.removeNamedItem('hidden');
        }

        var pc = [];

        let socket = io('/stream');

        var socketId = '';
        var myStream = '';
        var screen = '';
        var recordedStream = [];
        var mediaRecorder = '';
        var accept = '';

        //Get user video by default
        getAndSetUserStream();


        socket.on('connect', () => {
            //set socketId
            socketId = socket.io.engine.id;

            socket.emit('subscribe', {
                room: room,
                socketId: socketId
            });

            socket.on('new user', (data) => {
                socket.emit('newUserStart', { to: data.socketId, sender: socketId });
                pc.push(data.socketId);
                init(true, data.socketId);
            });

            socket.on('newUserStart', (data) => {
                pc.push(data.sender);
                init(false, data.sender);
            });

            socket.on('ice candidates', async (data) => {
                data.candidate ? await pc[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate)) : '';
            });

            socket.on('sdp', async (data) => {
                if (data.description.type === 'offer') {
                    data.description ? await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description)) : '';

                    h.getUserFullMedia().then(async (stream) => {
                        if (!document.getElementById('local').srcObject) {
                            h.setLocalStream(stream);
                        }

                        //save my stream
                        myStream = stream;

                        stream.getTracks().forEach((track) => {
                            pc[data.sender].addTrack(track, stream);
                        });

                        let answer = await pc[data.sender].createAnswer();

                        await pc[data.sender].setLocalDescription(answer);

                        socket.emit('sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId });
                    }).catch((e) => {
                        console.error(e);
                    });
                }

                else if (data.description.type === 'answer') {
                    await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
                }
            });

            socket.on('chat', (data) => {
                h.addChat(data, 'remote');
            });
        });

        function getAndSetUserStream() {
            h.getUserFullMedia().then((stream) => {
                // console.log('stream-getAndSetUserStream', stream);
                //save my stream
                myStream = stream;
                // console.log('myStream', myStream);

                h.setLocalStream(stream);
            }).catch((e) => {
                console.error(`stream error: ${e}`);
            });
        }

        function sendMsg(msg) {
            let data = {
                room: room,
                msg: msg,
                sender: username
            };

            //emit chat message
            socket.emit('chat', data);

            //add localchat
            h.addChat(data, 'local');
        }

        function init(createOffer, partnerName) {
            // console.log('createOffer', createOffer);

            pc[partnerName] = new RTCPeerConnection(h.getIceServer());
            if (screen && screen.getTracks().length) {
                screen.getTracks().forEach((track) => {
                    pc[partnerName].addTrack(track, screen);//should trigger negotiationneeded event
                });
            }

            else if (myStream) {
                myStream.getTracks().forEach((track) => {
                    pc[partnerName].addTrack(track, myStream);//should trigger negotiationneeded event
                });
            }

            else {
                h.getUserFullMedia().then((stream) => {
                    //save my stream
                    myStream = stream;

                    stream.getTracks().forEach((track) => {
                        pc[partnerName].addTrack(track, stream);//should trigger negotiationneeded event
                    });

                    h.setLocalStream(stream);
                }).catch((e) => {
                    console.error(`stream error: ${e}`);
                });
            }

            //create offer
            if (createOffer) {
                pc[partnerName].onnegotiationneeded = async () => {
                    let offer = await pc[partnerName].createOffer();

                    await pc[partnerName].setLocalDescription(offer);

                    socket.emit('sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId });
                };
            }

            //send ice candidate to partnerNames
            pc[partnerName].onicecandidate = ({ candidate }) => {
                socket.emit('ice candidates', { candidate: candidate, to: partnerName, sender: socketId });
            };

            //add
            pc[partnerName].ontrack = (e) => {
                let str = e.streams[0];
                if (document.getElementById(`${partnerName}-video`)) {
                    document.getElementById(`${partnerName}-video`).srcObject = str;
                }

                else {
                    //video elem
                    let newVid = document.createElement('video');
                    newVid.id = `${partnerName}-video`;
                    newVid.srcObject = str;
                    newVid.autoplay = true;
                    newVid.className = 'remote-video';

                    //show username elements
                    let userDiv = document.createElement('div');
                    userDiv.className = 'show-username';
                    userDiv.innerHTML = `<h4 class="user">${username}</h4>`;

                    // //show loader
                    // let loader = document.createElement( 'div' );
                    // loader.className = 'loader';
                    // loader.innerHTML = ``;

                    //video controls elements
                    let controlDiv = document.createElement('div');
                    controlDiv.className = 'remote-video-controls';
                    controlDiv.innerHTML = `<i class="fa fa-microphone text-white pr-3 mute-remote-mic" title="Mute"></i>
                        <i class="fa fa-expand text-white expand-remote-video" title="Expand"></i>`;

                    //create a new div for card
                    let cardDiv = document.createElement('div');
                    cardDiv.className = 'card card-sm';
                    cardDiv.id = partnerName;
                    cardDiv.appendChild(newVid);
                    cardDiv.appendChild(controlDiv);
                    // cardDiv.appendChild( loader );

                    //put div in main-section elem
                    document.getElementById('videos').appendChild(cardDiv);

                    h.adjustVideoElemSize();
                }
            };

            pc[partnerName].onconnectionstatechange = (d) => {
                switch (pc[partnerName].iceConnectionState) {
                    case 'disconnected':
                    case 'failed':
                        h.closeVideo(partnerName);
                        break;

                    case 'closed':
                        h.closeVideo(partnerName);
                        break;
                }
            };



            pc[partnerName].onsignalingstatechange = (d) => {
                switch (pc[partnerName].signalingState) {
                    case 'closed':
                        console.log("Signalling state is 'closed'");
                        h.closeVideo(partnerName);
                        break;
                }
            };
        }

        function shareScreen() {
            h.shareScreen().then((stream) => {
                h.toggleShareIcons(true);

                //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
                //It will be enabled was user stopped sharing screen
                h.toggleVideoBtnDisabled(true);

                //save my screen stream
                screen = stream;

                //share the new stream with all partners
                broadcastNewTracks(stream, 'video', false);

                //When the stop sharing button shown by the browser is clicked
                screen.getVideoTracks()[0].addEventListener('ended', () => {
                    stopSharingScreen();
                });
            }).catch((e) => {
                console.error(e);
            });
        }

        function stopSharingScreen() {
            //enable video toggle btn
            h.toggleVideoBtnDisabled(false);

            return new Promise((res, rej) => {
                screen.getTracks().length ? screen.getTracks().forEach(track => track.stop()) : '';

                res();
            }).then(() => {
                h.toggleShareIcons(false);
                broadcastNewTracks(myStream, 'video');
            }).catch((e) => {
                console.error(e);
            });
        }

        function broadcastNewTracks(stream, type, mirrorMode = true) {

            h.setLocalStream(stream, mirrorMode);

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for (let p in pc) {
                let pName = pc[p];

                if (typeof pc[pName] == 'object') {
                    h.replaceTrack(track, pc[pName]);
                }
            }
        }

        function toggleRecordingIcons(isRecording) {
            let e = document.getElementById('record');

            if (isRecording) {
                e.setAttribute('title', 'Stop recording');
                e.children[0].classList.add('text-danger');
                e.children[0].classList.remove('text-white');
            }

            else {
                e.setAttribute('title', 'Record');
                e.children[0].classList.add('text-white');
                e.children[0].classList.remove('text-danger');
            }
        }

        function startRecording(stream) {
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.start(1000);
            toggleRecordingIcons(true);

            mediaRecorder.ondataavailable = function (e) {
                recordedStream.push(e.data);
            };

            mediaRecorder.onstop = function () {
                toggleRecordingIcons(false);

                h.saveRecordedStream(recordedStream, username);

                setTimeout(() => {
                    recordedStream = [];
                }, 3000);
            };

            mediaRecorder.onerror = function (e) {
                console.error(e);
            };
        }

        //Chat textarea
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.which === 13 && (e.target.value.trim())) {
                e.preventDefault();

                sendMsg(e.target.value);

                setTimeout(() => {
                    e.target.value = '';
                }, 50);
            }
        });

        //When the video icon is clicked
        document.getElementById('toggle-video').addEventListener('click', (e) => {
            e.preventDefault();
            
            var elem = document.getElementById('toggle-video');
            var vicon = document.querySelector('#video-icon');
            var video_session = sessionStorage.getItem('video');
            var mic_session = sessionStorage.getItem('mic');
            console.log('video', myStream.getVideoTracks()[0].enabled);
            console.log('video_session',sessionStorage.getItem('video'));
            console.log('mic_session',sessionStorage.getItem('mic'));

            if (myStream.getVideoTracks()[0].enabled && video_session === 'true' && status === '0' && mic_session === 'true') {
                vicon.classList.remove('fa-video-slash');
                vicon.classList.add('fa-video');
                elem.setAttribute('title', 'Hide Video');

                myStream.getVideoTracks()[0].enabled = true;
                sessionStorage.setItem('video', false);
            }
            else if (myStream.getVideoTracks()[0].enabled) {
                vicon.classList.remove('fa-video');
                vicon.classList.add('fa-video-slash');
                elem.setAttribute('title', 'Show Video');

                myStream.getVideoTracks()[0].enabled = false;
            }
            else {
                vicon.classList.remove('fa-video-slash');
                vicon.classList.add('fa-video');
                elem.setAttribute('title', 'Hide Video');

                myStream.getVideoTracks()[0].enabled = true;
                sessionStorage.setItem('video', false);
            }

            broadcastNewTracks(myStream, 'video');
        });

        //When the mute icon is clicked
        document.getElementById('toggle-mute').addEventListener('click', (e) => {
            e.preventDefault();

            var elem = document.getElementById('toggle-mute');
            var micon = document.querySelector('#mic-icon');
            var video_session = sessionStorage.getItem('video');
        var mic_session = sessionStorage.getItem('mic');
            console.log('mic', myStream.getAudioTracks()[0].enabled);
            console.log('video_session',sessionStorage.getItem('video'));
            console.log('mic_session',sessionStorage.getItem('mic'));

            if (myStream.getAudioTracks()[0].enabled && video_session === 'true' && status === '0' && mic_session === 'true') {
                micon.classList.remove('fa-microphone-alt-slash');
                micon.classList.add('fa-microphone-alt');
                elem.setAttribute('title', 'Mute');

                myStream.getAudioTracks()[0].enabled = true;
                sessionStorage.setItem('mic', false);
            }
            else if (myStream.getAudioTracks()[0].enabled) {
                micon.classList.remove('fa-microphone-alt');
                micon.classList.add('fa-microphone-alt-slash');
                elem.setAttribute('title', 'Unmute');

                myStream.getAudioTracks()[0].enabled = false;
            }
            else {
                micon.classList.remove('fa-microphone-alt-slash');
                micon.classList.add('fa-microphone-alt');
                elem.setAttribute('title', 'Mute');

                myStream.getAudioTracks()[0].enabled = true;
                sessionStorage.setItem('mic', false);
            }

            broadcastNewTracks(myStream, 'audio');
        });

        //When user clicks the 'Share screen' button
        document.getElementById('share-screen').addEventListener('click', (e) => {
            e.preventDefault();

            if (screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState != 'ended') {
                stopSharingScreen();
            }

            else {
                shareScreen();
            }
        });

        //When record button is clicked
        document.getElementById('record').addEventListener('click', (e) => {
            /**
             * Ask user what they want to record.
             * Get the stream based on selection and start recording
             */
            if (!mediaRecorder || mediaRecorder.state == 'inactive') {
                h.toggleModal('recording-options-modal', true);
            }

            else if (mediaRecorder.state == 'paused') {
                mediaRecorder.resume();
            }

            else if (mediaRecorder.state == 'recording') {
                mediaRecorder.stop();
            }
        });

        //When user choose to record screen
        document.getElementById('record-screen').addEventListener('click', () => {
            h.toggleModal('recording-options-modal', false);

            if (screen && screen.getVideoTracks().length) {
                startRecording(screen);
            }

            else {
                h.shareScreen().then((screenStream) => {
                    startRecording(screenStream);
                }).catch(() => { });
            }
        });

        //When user choose to record own video
        document.getElementById('record-video').addEventListener('click', () => {
            h.toggleModal('recording-options-modal', false);

            if (myStream && myStream.getTracks().length) {
                startRecording(myStream);
            }

            else {
                h.getUserFullMedia().then((videoStream) => {
                    startRecording(videoStream);
                }).catch(() => { });
            }
        });
    }
});