////////////////////////////////////////////////////////////
//
// The sound object receives values from other controls and 
// uses them to change sound.
//
var actx = null;		// audiocontext

object_list.addobj( new objfactory("sound", soundobj) );

soundobj.prototype = Object.create(keyboardobj.prototype);

function noAudio()
{
}

function checkaudiocontext()
{
	if( typeof( AudioContext) !== "undefined" ){
		return actx = new AudioContext();
	}
	if( typeof( webkitAudioContext) !== "undefined" ){
		return actx = new webkitAudioContext();
	}
	alert("Web Audio not supported");
	return new noAudio();
}


function soundobj(ctx, parent, x, y, w, h)
{	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;

	if( actx == null){
		actx = checkaudiocontext();
	}

	this.setvalue = function(arg, val)
	{
		if( arg == null){
			return;
		}
		if( arg == "bend"){
			this.bend = val;
			xdebugmsg2 = "Bend="+val;
		}
		xdebugmsg2 = "Sound "+arg+" "+val;
	}

	this.setvalues = function(arg, chan, val)
	{
		if( arg == null){
			return;
		}
		if( arg == "key-on"){
		}else if( arg == "key-off")
		{
		}
		xdebugmsg2 = "Sound "+arg+" "+val[1];
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"sound", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}
}

///////////////////////////////////////////////////////////////////////////////
object_list.addobj( new objfactory("synth", synthobj) );

synthobj.prototype = Object.create(keyboardobj.prototype);

var note2freqtab = new Array(128);

function synthnote(note, chan)
{
	this.note = note;
	this.chan = chan;
	this.cnt = 1;
}

function lfo( synth)
{	this.val = 0;
	this.tval = 0;
	this.rate = 1000;
	this.step = 0;
	this.ticks = 0;
	this.synth = synth;
	this.square= false;

	this.timer = function()
	{
		this.tval =  (this.tval+this.rate) & 0xffff;
		if( this.square){
			if( this.tval < 32768){
				this.val = 0;
			}else {
				this.val = 65535;
			}
		}else {
			if( this.tval < 32768){
				this.val = this.tval;
			}else {
				this.val = 65536 - this.tval;
			}
			this.val = this.val+this.val;
		}
				
		this.ticks += timerval;
		if( this.ticks > 100){
			this.ticks -= 100;
			// send value to indicator
			this.synth.dosetvalue("lfovalue", this.val);
		}

		return false;
	}
}

function env( synth)
{	this.val = 0;
	this.synth = synth;
	this.state = 0;
	this.attack = 16000;
	this.decay = 1000;
	this.sustain = false;

	this.timer = function()
	{	// state 0 - idle or decay...
		// state 1 - attack
		// state 2 - decay - no sustain
		// state 3 - sustain
		if( this.state == 0 || this.state == 2){
			if( this.val > 0){
				this.val = this.val - this.decay;
				if( this.val < 0){
					this.val = 0;
				}
				if( this.val == 0){
					this.state = 0;
				}
			}
		}else if( this.state == 1){
			this.val =  (this.val+this.attack);
			if( this.val > 65535){
				this.val = 65535;
				if( this.sustain){
					this.state = 3;
				}else {
					this.state = 2;
				}
			}
		}
				
		this.ticks += timerval;
		if( this.ticks > 100){
			this.ticks -= 100;
			// send value to indicator
			this.synth.dosetvalue("envvalue", this.val);
		}

		this.noteon = function()
		{
			this.state = 1;
			xdebugmsg2 = "ENV on";
		}

		this.noteoff = function()
		{
			this.state = 0;
			xdebugmsg2 = "ENV off";
		}

		return false;
	}
}

function synthobj(ctx, parent, x, y, w, h)
{	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;
	this.chan = 0;

	if( actx == null){
	actx = checkaudiocontext();
	}
	this.osc = actx.createOscillator();
	this.osc.type = "square";
	this.vca = actx.createGain();
	this.vcf = actx.createBiquadFilter();
	this.vcf.type="lowpass";

	this.nfreq = 0;
	this.freq = 0;
	this.lfomodfreq = 0;
	this.glide = 0;
	this.vcffreq = 880;
	this.vcfq = 0.9;
	this.vcfmodfreq = 0;
	this.volume = 0;
	this.notelist = new objlist();

	this.vcomodsrc = 0;
	this.vcomoddst = 0;
	this.vcomodamount = 0;

	this.vcfmodsrc = 0;
	this.vcfmodpolarity = 0;
	this.vcfmodamount = 0;

	this.vcamode = 0;		// EG controlled, 1 = always on

	this.lfo = new lfo(this);
	this.env = new env(this);


// connect the audio bits
	this.osc.connect( this.vcf);
	this.vcf.connect( this.vca);
	this.vca.connect( actx.destination);

	this.notefreq = function( note ) {
			return 440 * Math.pow(2,(note-69)/12);
	}

	this.setoscfreq = function( glide)
	{
		this.osc.frequency.cancelScheduledValues(0);
		this.osc.frequency.setTargetAtTime( this.notefreq(this.freq+this.nfreq+this.lfomodfreq), 0, 0.01);
	}

	this.setoscwave = function( val)
	{
//			this.osc.frequency.cancelScheduledValues(0);
			if( val != 0){
				this.osc.type = "square";
			}else {
				this.osc.type = "sawtooth";
			}
	}

	this.setvcf = function()
	{
		this.vcf.frequency.cancelScheduledValues(0);
		this.vcf.frequency.setTargetAtTime( this.notefreq(this.vcffreq+this.vcfmodfreq), 0, 0.01); 
		this.vcf.Q.cancelScheduledValues(0);
		this.vcf.Q.setTargetAtTime( this.vcfq, 0, 0.01); 

		xdebugmsg2 = "setvcf "+this.notefreq(this.vcffreq)+" "+this.vcfq;
	}

	this.setvca = function(val )
	{
		this.vca.gain.setValueAtTime( val, 0.01);
	}

	// most values are 0 - 65535
	//
	this.setvalue = function(arg,val)
	{ var tmp;

	xdebugmsg2 = "set synth "+arg+"  "+val;
		if( arg == "freq"){
			this.freq = val/512;
			this.setoscfreq( 0);
		}else if( arg == "glide"){
			this.glide = val;
		}else if( arg == "cutoff"){
			this.vcffreq = val/512;
			this.setvcf();
		}else if( arg == "resonance"){
			this.vcfq = val/4096;
			this.setvcf();
		}else if( arg == "wave"){
			this.setoscwave(val);

		}else if( arg == "vcomodamount"){
			this.vcomodamount = val;
		}else if( arg == "vcomodsrc"){
			this.vcomodsrc = val;
		}else if( arg == "vcomoddst"){
			this.vcomoddst = val;
			this.lfomodfreq = 0;

		}else if( arg == "vcfmodamount"){
			this.vcfmodamount = val;
		}else if( arg == "vcfmodsrc"){
			this.vcfmodsrc = val;
		}else if( arg == "vcfmodpolarity"){
			this.vcfmodpolarity = val;

		}else if( arg == "vca"){
			this.setvca(  (val/65535)*this.volume);
		}else if( arg == "vcamode"){
			this.vcamode = val;

		}else if( arg == "lforate"){
			this.lfo.rate = val/20;
		}else if( arg == "lfowave"){
			if( val != 0){
				this.lfo.square = true;
			}else {
				this.lfo.square = false;
			}

		}else if( arg == "envsustain"){
			this.env.sustain = (val != 0);
			if( this.env.state == 3){
				this.env.state = 2;
			}
		}else if( arg == "envattack"){
			tmp = Math.floor(Math.pow( 2, (65536-val)/4096)); 
	xdebugmsg2 = "attack "+tmp+"  "+val;
			this.env.attack = tmp;
		}else if( arg == "envdecay"){
			tmp = Math.floor(Math.pow( 2, (65536-val)/4096)); 
	xdebugmsg2 = "decay "+tmp+"  "+val;
			this.env.decay = tmp;

		}else if( arg == "all-notes-off"){
			this.allnotesoff();
		}
		this.dosetvalue(arg, val);
	}


	// chan 0 only...
	this.setvalues = function(arg, chan, val)
	{
		if( chan == this.chan){
			
xdebugmsg2 = "synth values "+arg+"  "+val[1];
			if( arg == "key-on"){
				if( this.volume == 0){
					this.volume = 0.2;
				}
				if( this.newnote( val[1], chan) ){
					this.nfreq = val[1] ;
					// if first key
					if( this.notelist.head.next == null){
						this.setoscfreq( 0);
					}else {
						this.setoscfreq( this.glide / 65535);
					}
					this.env.noteon();
				}
			}else if( arg == "key-off")
			{	var curnote = -1;

				if( this.notelist.head != null){
					curnote = this.notelist.head.ob.note;
				}
				if( this.islastnote(val[1]) ){
					this.setvalue("vca",0);
					this.env.noteoff();
				}else {
					if( curnote != this.notelist.head.ob.note){
						this.nfreq = this.notelist.head.ob.note;
						this.setoscfreq( this.glide / 65535);
					}
				}
			}
			return;		// if for synth dont pass on...
		}
		this.dosetvalues(arg, chan, val);
	}

	// last key has priority
	this.newnote = function(note, chan)
	{	var nl = this.notelist.head;
		
		while(nl != null){
			if( nl.ob.note == note){
				nl.ob.cnt++;
				return false;
			}
			nl = nl.next;
		}
		this.notelist.addobj( new synthnote(note, chan) );
		return true;
	}

	this.islastnote = function(note)
	{	var nl = this.notelist.head;

	xdebugmsg2 = this.shownotelist();

		while(nl != null){
			if( nl.ob.note == note){
				this.notelist.removeobj( nl);
				if( this.notelist.head == null){
					return true;
				}
				return false;
			}

			nl = nl.next;
		}
		return true;		// not found ignore.
	}

	this.shownotelist = function()
	{	var nl = this.notelist.head;
		var msg = "";

		while( nl != null){
			msg += nl.ob.note+" ";
			nl = nl.next;
		}
		return msg;
	}

	this.allnotesoff = function()
	{ var msg3 = [ 0x80, 0, 0];

		while(this.notelist.head != null){
			msg3[0] = 0x80 | (this.chan & 0xf);
			msg3[1] = this.notelist.head.ob.note;

			this.setvalues("key-off", this.chan, msg3);
		}
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"synth", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}

	this.timer = function()
	{	var tmp;

		this.lfo.timer();
		this.env.timer();

		if( this.vcomodsrc == 0)
		{	// lfo
			tmp = this.lfo.val;
		}else{
			tmp = this.env.val;
		}
		if( this.vcomoddst == 0)
		{	// freq
			this.lfomodfreq = ( (tmp /1024) * (this.vcomodamount / 65536));
			this.setoscfreq(this.glide / 65535);
		}else {
			// pwm
		}

		if( this.vcfmodsrc == 0)
		{	// src = lfo
			tmp = this.lfo.val;
		}else{
			tmp = this.env.val;
		}

		if( this.vcfmodpolarity == 1)
		{
			tmp = 65536-tmp;
		}
		this.vcfmodfreq = ( (tmp /1024) * (this.vcfmodamount / 65536));
		this.setvcf();
		

		// adjust the vca gain
		if( this.vcamode == 0)
		{
			this.setvca( (this.env.val/65535)*this.volume );
		}else {
			this.setvca( this.volume );
		}
		return false;
	}

	this.vca.gain.setValueAtTime(0,0);
	timer_list.addobj( this, null);
	this.osc.start(0);
//	this.osc.noteOn(0);
	
	

}


