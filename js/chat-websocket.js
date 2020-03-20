// SignalR Chat Client

"use strict";

function SignalRChatHubConnection(hub) {
    // From SignalR Javascript Library
    let messageTypes = {
        /** Indicates the message is an Invocation message and implements the {@link @aspnet/signalr.InvocationMessage} interface. */
        Invocation: 1,
        /** Indicates the message is a StreamItem message and implements the {@link @aspnet/signalr.StreamItemMessage} interface. */
        StreamItem: 2,
        /** Indicates the message is a Completion message and implements the {@link @aspnet/signalr.CompletionMessage} interface. */
        Completion: 3,
        /** Indicates the message is a Stream Invocation message and implements the {@link @aspnet/signalr.StreamInvocationMessage} interface. */
        StreamInvocation: 4,
        /** Indicates the message is a Cancel Invocation message and implements the {@link @aspnet/signalr.CancelInvocationMessage} interface. */
        CancelInvocation: 5,
        /** Indicates the message is a Ping message and implements the {@link @aspnet/signalr.PingMessage} interface. */
        Ping: 6,
        /** Indicates the message is a Close message and implements the {@link @aspnet/signalr.CloseMessage} interface. */
        Close: 7,
    };

    let baseUrl = "http://0.0.0.0:5000";
    let baseWsUrl = "ws://0.0.0.0:5000";
    let delimiter = "\u001e";

    let state = "created";
    let events = {};
    let invocations = {};
    let websocket = null;

    // Not really neccerry....
    let negotiate = (hubUrl) => {
        return fetch(hubUrl + "/negotiate", {
            method: "POST",
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then((response) => {
            return response.json();
        });
    }

    let onMessage = (data) => {
        let type = data.type;
        if (type === messageTypes.Ping) {
            // Ping the server back
            websocket.send(JSON.stringify(data) + delimiter)
        } else if (type === messageTypes.Completion) {
            // Result after invocation from client
            invocations[data.invocationId].resolver(data.result);
            delete invocations[data.invocationId];
        } else if (type === messageTypes.Invocation) {
            // Invocation request from server
            let callback = events[data.target];
            if (callback) {
                callback(data.arguments[0]);
            }
        } else if (type === messageTypes.CancelInvocation) {

        } else if (type === messageTypes.Close) {
            state = "dead";
            // Sørg for at websocket er lukka og disposa + iterer over alle rejectors og kast ei feilmelding
        }
    };

    this.on = (event, callback) => {
        if (state == "dead") throw Error("Hub is dead...");
        events[event] = callback;
    };

    this.off = (event) => {
        if (state == "dead") throw Error("Hub is dead...");
        delete event[event];
    };

    this.invoke = (method, message) => {
        if (state == "dead") throw Error("Hub is dead...");
        return new Promise((resolve, reject) => {
            let invocationId = Object.getOwnPropertyNames(invocations).length + "";
            invocations[invocationId] = { resolver: resolve, rejecter: reject };
            let invocation = {
                type: 1,
                invocationId: invocationId,
                target: method,
                arguments: [message]
            };
            websocket.send(JSON.stringify(invocation) + delimiter);
        });
    };

    this.start = () => {
        if (state != "created") Error("Hub is already started, og dead...");
        return new Promise((resolve, reject) => {
            // websocket = new WebSocket(baseWsUrl + "/" + hub + "?id=" + result.connectionId);
            websocket = new WebSocket(baseWsUrl + "/" + hub);
            websocket.addEventListener("open", (event) => {
                let handshakeMessage = {
                    protocol: "json",
                    version: 1
                };
                websocket.send(JSON.stringify(handshakeMessage) + delimiter);
            });
            websocket.addEventListener("message", (event) => {
                let messages = event.data.split(delimiter);
                for (let i = 0; i < messages.length - 1; ++i) { // Last message is always empty
                    let message = JSON.parse(messages[i]);
                    if (message.type === undefined) {
                        // Connection success / ack
                        resolve();
                    } else {
                        onMessage(message);
                    }
                } 
            });
            websocket.addEventListener("error", (event) => {
                state = "dead";
                // Sørg for at websocket er lukka og disposa + iterer over alle rejectors og kast ei feilmelding
            });
            websocket.addEventListener("close", (event) => {
                state = "dead";
                // Sørg for at websocket er lukka og disposa + iterer over alle rejectors og kast ei feilmelding
            });
        })
    }
}

let nicknameInput = document.getElementById("nickname");
let messageBox = document.getElementById("message-box");
let sendButton = document.getElementById("send-button");
let groupSelect = document.getElementById("group-select");
let privateGroupButton = document.getElementById("toggle-private-group");
let chatBox = document.getElementById("chat-box");
let activityLogBox = document.getElementById("activity-log-box");

let connection = new SignalRChatHubConnection("chat");

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

let nicknameUrl = "http://0.0.0.0:5000/nickname";
let fetchNickname = () => {
    return fetch(nicknameUrl)
    .then((response) => {
        return response.text();
    });
}

fetchNickname().then((nickname) => {
    nicknameInput.value = nickname;
});