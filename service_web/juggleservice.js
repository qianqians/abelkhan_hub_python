function juggleservice(){
    this.process_set = [];
    
    this.add_process = function(_process){
		this.process_set.push(_process);
    }
    
    this.poll = function(){
        for(var p in this.process_set){
            p.poll();
        }
    }
}