import helpers from "./helpers.js";
// import swal from "../node_modules/sweetalert/dist/sweetalert.min";
'use strict';

window.addEventListener("load", () => {
  //When the chat icon is clicked
  document.querySelector("#toggle-chat-pane").addEventListener("click", (e) => {
    let chatElem = document.querySelector("#chat-pane");
    let mainSecElem = document.querySelector("#main-section");

    if (chatElem.classList.contains("chat-opened")) {
      chatElem.setAttribute("hidden", true);
      mainSecElem.classList.remove("col-md-9");
      mainSecElem.classList.add("col-md-12");
      chatElem.classList.remove("chat-opened");
    } else {
      chatElem.attributes.removeNamedItem("hidden");
      mainSecElem.classList.remove("col-md-12");
      mainSecElem.classList.add("col-md-9");
      chatElem.classList.add("chat-opened");
    }

    //remove the 'New' badge on chat icon (if any) once chat is opened.
    setTimeout(() => {
      if (
        document.querySelector("#chat-pane").classList.contains("chat-opened")
      ) {
        helpers.toggleChatNotificationBadge();
      }
    }, 300);
  });

  //When the video frame is clicked. This will enable picture-in-picture
  document.getElementById("local").addEventListener("click", () => {
    if (!document.pictureInPictureElement) {
      document
        .getElementById("local")
        .requestPictureInPicture()
        .catch((error) => {
          // Video failed to enter Picture-in-Picture mode.
          console.error(error);
        });
    } else {
      document.exitPictureInPicture().catch((error) => {
        // Video failed to leave Picture-in-Picture mode.
        console.error(error);
      });
    }
  });

  //When the 'Create room" is button is clicked
  document.getElementById("create-room").addEventListener("click", (e) => {
    e.preventDefault();

    let roomName = document.querySelector("#room-name").value;
    let yourName = document.querySelector("#your-name").value;
    let password = document.querySelector("#password").value;

    if (roomName && yourName && password) {
      if (password === "333") {
        document.querySelector("#err-msg").innerHTML = "";

        //save the user's name in sessionStorage
        sessionStorage.setItem("username", yourName);
        sessionStorage.setItem("status", 1);

        //create room link
        let roomLink = `${location.origin}?room=${roomName
          .trim()
          .replace(" ", "_")}_${helpers.generateRandomString()}`;
        sessionStorage.setItem("roomLink", roomLink);
        // open the link
        window.location.href = roomLink;

        //show message with link to room
        // document.querySelector( '#room-created' ).innerHTML = `Room successfully created. Click <a href='${ roomLink }'>here</a> to enter room.
        //     Share the room link with your partners.`;

        //empty the values
        document.querySelector("#room-name").value = "";
        document.querySelector("#your-name").value = "";
        document.querySelector("#password").value = "";
        // document.querySelector( '#member' ).attributes.removeNamedItem( 'hidden' );
      } else {
        document.querySelector("#err-msg").innerHTML = "Password is wrong";
        // member.style.display = "none";
      }
    } else {
      document.querySelector("#err-msg").innerHTML = "All fields are required";
      // member.style.display = "none";
    }
  });

  let g_name = null;
  //When the 'Enter room' button is clicked.
  document.getElementById("enter-room").addEventListener("click", (e) => {
    e.preventDefault();

    let name = document.querySelector("#username").value;
    let video = document.querySelector("#video-check").checked;
    let mic = document.querySelector("#mic-check").checked;
    let btn = document.getElementById("enter-room");

    if (name) {
      g_name = name;
      //remove error message, if any
      document.querySelector("#err-msg-username").innerHTML = "";

      //save the user's name in sessionStorage
      sessionStorage.setItem("username", name);
      sessionStorage.setItem("video", video);
      sessionStorage.setItem("mic", mic);
      sessionStorage.setItem("status", 0);
      member.style.display = "block";
      //reload room
      console.log(sessionStorage.getItem("username"));

      location.reload();

      // if (sessionStorage.getItem('status') === null) {
      //     btn.disabled = true;
      //     btn.textContent = 'Waiting for admin response ...'
      //     console.log('waiting......');
      // }
    } else {
      document.querySelector("#err-msg-username").innerHTML =
        "Please input your name";
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("expand-remote-video")) {
      // console.log('expand-remote-video');
      helpers.maximiseStream(e);
    } else if (e.target && e.target.classList.contains("mute-remote-mic")) {
      // console.log('mute-remote-mic');
      helpers.singleStreamToggleMute(e);
    }
  });

  document.getElementById("closeModal").addEventListener("click", () => {
    helpers.toggleModal("recording-options-modal", false);
  });

  document.getElementById("call-reject").addEventListener("click", () => {
    helpers.toggleModal("call-modal", false);
  });

  document.getElementById("logout").addEventListener("click", () => {
    //create homeLink link
    // let homeLink = `${location.origin}?room=${roomName.trim().replace(' ', '_')}_${helpers.generateRandomString()}`;
    // open the link
    swal({
      title: "Are you sure?",
      text: "Do you want to leave?",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willLogout) => {
      if (willLogout) {
        swal({
          title: "Logout Successful",
          text: "Redirecting...",
          icon: "success",
          buttons: false,
        });
        window.location.href = location.origin;
        sessionStorage.clear();
      } else {
      }
    });
  });

});