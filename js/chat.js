// SignalR Chat Client

"use strict";

let baseUrl = "http://0.0.0.0:5000"
let chatHubUrl = baseUrl + "/chat";
let nicknameUrl = baseUrl + "/nickname";

var connection = new signalR.HubConnectionBuilder().withUrl(chatHubUrl).build();

let nicknameInput = document.getElementById("nickname");
let messageBox = document.getElementById("message-box");
let sendButton = document.getElementById("send-button");
let groupSelect = document.getElementById("group-select");
let privateGroupButton = document.getElementById("toggle-private-group");
let chatBox = document.getElementById("chat-box");
let activityLogBox = document.getElementById("activity-log-box");

//Disable send button until connection is established
sendButton.disabled = true;

connection.on("ReceiveMessageFromSelf", ({body}) => {
    let msg = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let nickname = nicknameInput.value;
    let encodedMsg = nickname + ": " + msg;
    let p = document.createElement("p");
    p.textContent = encodedMsg;
    chatBox.appendChild(p);
});

connection.on("ReceiveMessageFromUser", ({sender, body}) => {
    let msg = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let encodedMsg = sender.slice(0, 10) + "... says: " + msg;
    let p = document.createElement("p");
    p.textContent = encodedMsg;
    chatBox.appendChild(p);
});

connection.on("ReceiveMessageFromGroup", ({group, sender, body}) => {
    let msg = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let encodedMsg = sender.slice(0, 10) + "... (" + group + ") says: " + msg;
    let p = document.createElement("p");
    p.textContent = encodedMsg;
    chatBox.appendChild(p);
});

connection.on("UserConnected", ({id}) => {
    let option = document.createElement("option");
    option.value = id;
    option.text = "User: " + id;
    groupSelect.add(option);

    let logMsg = "User connected (connectionId: " + id + ")";
    let div = document.createElement("div");
    div.textContent = logMsg;
    activityLogBox.appendChild(div);
})

connection.on("UserDisconnected", ({id}) => {
    for (var i = 0; i < groupSelect.length; ++i) {
        if (groupSelect.options[i].value == id) {
            groupSelect.remove(i);
            break;
        }
    }

    let logMsg = "User disconnected (connectionId: " + id + ")";
    let div = document.createElement("div");
    div.textContent = logMsg;
    activityLogBox.appendChild(div);
})

connection.on("UserJoinedGroup", ({id, participant}) => {
    let logMsg = "User joined group: " + id + " (connectionId: " + participant + ")";
    let div = document.createElement("div");
    div.textContent = logMsg;
    activityLogBox.appendChild(div);
})

connection.on("UserLeftGroup", ({id, participant}) => {
    let logMsg = "User left group: " + id + " (connectionId: " + participant + ")";
    let div = document.createElement("div");
    div.textContent = logMsg;
    activityLogBox.appendChild(div);
})

connection.start().then(() => {
    sendButton.disabled = false;

    let option = document.createElement("option");
    option.value = "Myself";
    option.text = "Myself";
    groupSelect.add(option);

    let logMsg = "You connected!";
    let div = document.createElement("div");
    div.textContent = logMsg;
    activityLogBox.appendChild(div);

    let group = "global";
    let groupText = "Group: Global"
    connection.invoke("JoinGroup", {id: group}).then(() => {
        let option = document.createElement("option");
        option.value = group;
        option.text = groupText;
        groupSelect.add(option);

        let logMsg = "You joined group: " + group;
        let div = document.createElement("div");
        div.textContent = logMsg;
        activityLogBox.appendChild(div);
    }).catch((err) => {
        return console.error(err.toString());
    });
}).catch((err) => {
    return console.error(err.toString());
});

sendButton.addEventListener("click", (event) => {
    let group = groupSelect.options[groupSelect.selectedIndex].value;
    let groupText = groupSelect.options[groupSelect.selectedIndex].text;
    var message = messageBox.value;

    if (groupText.startsWith("Myself")) {
        connection.invoke("SendMessageToCaller", {body: message}).catch((err) => {
            return console.error(err.toString());
        });
    } else if (groupText.startsWith("User")) {
        connection.invoke("SendMessageToUser", {receiver: group, body: message}).catch((err) => {
            return console.error(err.toString());
        });
    } else if (groupText.startsWith("Group")) {
        connection.invoke("SendMessageToGroup", {group: group, body: message}).catch((err) => {
            return console.error(err.toString());
        });
    }
});

privateGroupButton.addEventListener("click", (event) => {
    let group = "private";
    let groupText = "Group: Private"
    var doLeaveGroup = false;
    for (var i = 0; i < groupSelect.length; ++i) {
        if (groupSelect.options[i].value == group) {
            groupSelect.remove(i);
            doLeaveGroup = true;
            break;
        }
    }

    if (doLeaveGroup) {
        connection.invoke("LeaveGroup", {id: group}).then(() => {
            let logMsg = "You left group: " + group;
            let div = document.createElement("div");
            div.textContent = logMsg;
            activityLogBox.appendChild(div);

            privateGroupButton.textContent = "Join private group";
        }).catch((err) =>{
            return console.error(err.toString());
        });
    } else {
        connection.invoke("JoinGroup", {id: group}).then(() => {
            let option = document.createElement("option");
            option.value = group;
            option.text = groupText;
            groupSelect.add(option);
    
            let logMsg = "You joined group: " + group;
            let div = document.createElement("div");
            div.textContent = logMsg;
            activityLogBox.appendChild(div);

            privateGroupButton.textContent = "Leave private group";
        }).catch((err) => {
            return console.error(err.toString());
        });
    }
})

let fetchNickname = () => {
    return fetch(nicknameUrl)
    .then((response) => {
        return response.text();
    });
}

fetchNickname().then((nickname) => {
    nicknameInput.value = nickname;
});