new Vue({
    el: '#app',

    data: {
        ws: null, // Our websocket connection
        tableId: null, // meeting ID
        stackContent: '', // Current speaker queue stack
        name: null, // The users name
        joined: false, // If a user is joined to a websocket connection or not
        meetingUrl: null, // The meeting URL that can be copy/pasted and sent to others to connect to this meeting
        clientId: null, // Unique ID of the client
        userList: null, // Current list of users. This will be a prop object that includes other information like number of times spoken and associated client IDs of names
        isMod: null, // Bool that tells client if they are a mod or not, and will allow showing of various mod tools
        requestsToStack: null, // Current list of users asking mod to get on stack
        modNotes: null // This will be populated by the mod as needed and pertain to the users connected to a meeting. Will auto flush when users leave
    },

    created: function() {
        let urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('meeting_id')) {
            this.tableId = urlParams.get('meeting_id');
        };
        if (window.location.protocol == "http:"){
            this.wsProtocol = "ws:"
        } else {
            this.wsProtocol = "wss:"
        };
    },

    methods: {
        sendon: function () {
            if (this.newMsg != '') {
                this.ws.send(
                    JSON.stringify({
                        tableId: this.tableId,
                        action: "on",
                        name: this.name
                    }
                ));
            }
        },

        sendoff: function () {
            if (this.newMsg != '') {
                this.ws.send(
                    JSON.stringify({
                        tableId: this.tableId,
                        action: "off",
                        name: this.name
                    }
                ));
            }
        },

        startDrag: (evt, user) => {
            evt.dataTransfer.dropEffect = 'move'
            evt.dataTransfer.effectAllowed = 'move'
            evt.dataTransfer.setData('itemID', user.id)
        },

        join: function () {
            // Validate inputs
            if (!this.tableId && !this.name) {
                Materialize.toast('You must set a meeting ID and name to join a meeting.', 2000);
                return
            }
            if (!this.tableId) {
                Materialize.toast('You must set a meeting ID', 2000);
                return
            }
            if(!this.name) {
                Materialize.toast('You must set a name', 2000);
                return
            }

            // Store self for later reference
            var self = this;

            // Join an on-going meeting by ID and update session values
            this.meetingUrl = 'http://localhost:5000/http://localhost:8080/?meeting_id=' + this.tableId;
            this.ws = new WebSocket(this.wsProtocol + '//localhost:8080/?meeting_id=' + this.tableId);
            this.joined = true;

            // Set up event listeners to handle incoming/outgoing messages and open/close actions
            this.ws.addEventListener('message', function(e) { messageListener(self, e) });
        },

        create: async function (submitEvent) {
            // Validate inputs
            if(!this.name) {
                Materialize.toast('You must set a name', 2000);
                return
            }

            // Store self for later reference
            var self = this;

            // Execute fetch to create a new WebSocket hub to connect to and store info back
            const requestOptions = {
                method: "POST",
                headers: { "Accept": "application/json" },
                body: JSON.stringify({"modActions": ["test", "addStack", "removeStack", "reorderStack"]})
            };
            await fetch('http://localhost:5000/http://localhost:8080/', requestOptions)
              .then(response => response.json())
              .then(data => self.tableId = data.meetingId);

            // Set up new WebSocket to be used with the required meeting ID and update session values
            this.meetingUrl = 'http://localhost:5000/http://localhost:8080/?meeting_id=' + this.tableId;
            this.ws = new WebSocket(this.wsProtocol + '//localhost:8080/?meeting_id=' + this.tableId);
            this.joined = true;

            // Set up event listeners to handle incoming/outgoing messages and open/close actions
            this.ws.addEventListener('message', function(e) { messageListener(self, e) });
        }
    }
});

function messageListener(self, event) {
    self.stackContent = "";
    console.log(event.data);
    var messageData = $.parseJSON(event.data);

    switch (messageData.action) {
        case "registerSelfUser":
            if(self.clientId == null){
                console.log("Registering self " + messageData.clientId);
                self.clientId = messageData.clientId;
            }
            var msg = {
                meetingId: self.tableId,
                action: "newUser",
                clientId: self.clientId,
                msgData: {clientName: self.name},
            };
            console.log("New user to add to list found, sending message to other clients:")
            console.log(msg);
            self.ws.send(JSON.stringify(msg));
            break;
        case "newUser":
            console.log(messageData);
            if (self.userList == null) {
                self.userList = [];
            }
            var checkList = self.userList.find(usr => usr.id === messageData.clientId);
            if(!checkList) {
                self.userList.push({id: messageData.clientId, name: messageData.msgData.clientName});
                var msg = {
                    meetingId: self.tableId,
                    action: "newUser",
                    clientId: self.clientId,
                    msgData: {clientName: self.name},
                };
                console.log("New user to add to list found, sending message to other clients:")
                console.log(msg);
                self.ws.send(JSON.stringify(msg));
            }
            break;
        case "test":
            console.log("test action run");
            break;
        case "addStack":
            console.log("addStack run");
            break;
        case "removeStack":
            console.log("removeStack run");
            break;
        case "reorderStack":
            console.log("reorderStack run");
            break;
        case "removeUser":
            var clientObj = self.userList.find(usr => usr.id === messageData.clientId);
            if(clientObj) {
                self.userList = self.userList.filter(item => item !== clientObj);
            }
            break;
        default:
            console.log("no recognized action supplied - " + messageData.action);
    }
}

function copyMeetingUrl() {
    /* Get the text field */
    var copyText = document.getElementById("meetingUrl");
  
    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */
  
    /* Copy the text inside the text field */
    document.execCommand("copy");
  
    /* Alert the copied text */
    Materialize.toast('Meeting URL copied.', 2000);
}