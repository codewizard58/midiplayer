/// base functionality used by the keyboard.js and midi.js components.
//
//

var xdebugmsg="";
var xdebugmsg2="";

function startdebug()
{ var d = document.getElementById("debugmsg");
	if( d != null){
	  d.innerHTML = "Debug:<br /> Mode="+mode+" Bytes="+datalen+"<br />\n";
	}
}

function debugmsg(p, l, msg)
{ var d = document.getElementById("debugmsg");
  var dmsg = ""+p+" "+l+" "+msg;

  if( mididebug == 1 && d != null){
	  d.innerHTML += dmsg+" "+ hexof(p, l)+"<br />\n";
  }
}

///////////////////////////////////////////////////////////////

var timerval= 10;
var timer_list = new objlist();
var scene_list = new objlist();


////////////////////////////////////////////////////////////////
// link list of objects
//

function objlist()
{	this.head = null;

	this.addobj = function( ob, data)
	{	var o = new obj(this, ob, data);

		o.next = this.head;
		if( this.head != null){
			o.next.prev = o;
		}
		this.head = o;
//		alert("Addobj");

		return o;
	}

	this.removeobj = function( ob)
	{
		if( ob.list != this){
		xdebugmsg = "REMOVE list not this";
			return;
		}

		// remove from list;
		if( ob.prev != null){
			ob.prev.next = ob.next;
		}
		if( ob.next != null){
			ob.next.prev = ob.prev;
		}
		// see if this is the head one.
		if( ob == this.head){
			this.head = ob.next;
		}
	}

	this.reverse = function()
	{	var t,t2;

		if( this.head == null){
			return;
		}
		t = this.head;
		this.head = null;

		while( t != null){
			t2 = t.next;
			t.next = this.head;
			t.prev = null;
			this.head = t;
			if( t.next != null){
				t.next.prev = t;
			}
			t = t2;
		}
	}
}

function obj(list, ob, data)
{	this.next = null;
	this.prev = null;
	this.ob = ob;
	this.data = data;
	this.list = list;

}

function objfactory(name, func)
{	this.name = name;
	this.makefunc = func;

	this.istype = function( name)
	{
		return name == this.name;
	}

	this.create = function( ctx, parent, x, y, w, h)
	{
		return new this.makefunc(ctx, parent, x, y, w, h);
	}
}


/////////////////////////////////////////////////////////////////

function process()
{	
	loadscenes();

	setInterval(timer_doTempo, timerval);
}

////////////////////////////////////////////////////////////////////////////

var debugticks = 0;

function showdebug()
{	var d = document.getElementById('debugmsg');

	if( d != null){
		d.innerHTML = ""+xdebugmsg+"<br>\n"+xdebugmsg2+"<br>\n";
	}

}

function timer_doTempo()
{	var ol;
	var msg="";

	debugticks++;
	if( debugticks == 10){
		debugticks = 0;

		showdebug();
	}

	ol = timer_list.head;
	while(ol != null){
		if( ol.ob.timer(ol.data)){
			timer_list.removeobj(ol);
		}
		ol = ol.next;
	}
}

///////////////////////////////////////////////////////////////////////////

 ////////////////////////// base64 conversions
 ///

var base64tab ="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function base64Encode( datain )
{	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;
	var cnt;

 
	while (i < datain.length) {
		cnt = 1;
		chr2 = 0;
		chr3 = 0;
		chr1 = datain[i++];
		if( i < datain.length ){
			chr2 = datain[i++];
			cnt++;
		}
		if( i < datain.length ){
			chr3 = datain[i++];
			cnt++;
		}
 
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		if( cnt > 1){
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			if( cnt > 2){
				enc4 = chr3 & 63;
			}else {
				enc4 = 64;
			}
		}else {
			enc3 = enc4 = 64;
		}
 
 
		output = output +
		base64tab.charAt(enc1) + base64tab.charAt(enc2) +
		base64tab.charAt(enc3) + base64tab.charAt(enc4);
 
	}
	return output;
}

function base64Decode( datain)
{
	var output = "";
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;
 
	input = datain.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
	while (i < input.length) {
 
		enc1 = base64tab.indexOf(input.charAt(i++));
		enc2 = base64tab.indexOf(input.charAt(i++));
		enc3 = base64tab.indexOf(input.charAt(i++));
		enc4 = base64tab.indexOf(input.charAt(i++));
 
		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;
 
		output = output + String.fromCharCode(chr1);
 
		if (enc3 != 64) {
			output = output + String.fromCharCode(chr2);
		}
		if (enc4 != 64) {
			output = output + String.fromCharCode(chr3);
		}
 
	}
 
	return output;
 }

///////////////////////////////////////////////////////////////
///////

function findscene( scene)
{	var sl = scene_list.head;

	while( sl != null){
		if( sl.ob.scene == scene){
			return sl.ob;
		}
		sl = sl.next;
	}
	return null;
}

function findscenebyname( scenename)
{	var sl = scene_list.head;

	while( sl != null){
		if( sl.ob.scenename == scenename){
			return sl.ob;
		}
		sl = sl.next;
	}
	return null;
}

