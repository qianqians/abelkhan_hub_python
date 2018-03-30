function event_closure(){
    this.events = {}

    this.add_event_listen = function(event, mothed){
        this.events[event] = mothed;
    }

    this.call_event = function(event, argvs){
        if (this.events[event]){
            this.events[event].apply(null, argvs);
        }
    }
}
