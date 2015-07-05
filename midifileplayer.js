///////////////////////////////////////////////////////////////
//
// Midi file decoder and player.

var tracklist = null;
var runningstatus = 0;
var format = 2;		// 0 - original, 1 - newer, 2 - midi format, 3 - compact
var mode = "normal";
var g_millis=0;
var g_ppqn = 192;
var g_tempo= 500000;
var outputlist = null;
var chosenOutput = 0;

//////////////////////////////////////////////////////////////////////////

timer_list.addobj( new midifile_process(), null);

function midifile_process()
{

	this.timer = function()
	{
		var but = document.getElementById( mode );

		if( but != null){
		  but.style.backgroundColor="blue";
		  but.style.color="white";
		}	

		addoutputopt();

		parsedata();

		displaydata( mode);

		return true;			// only used once
	}
}

////////////////////////////////////////////////////////////////////
// notes

function notes(note, vel, chan, start)
{	this.note = note;
	this.vel = vel;
	this.chan = chan;
	this.start= start;
	this.next = null;
	this.prev = null;

}

//////////////////////////////////////////////////////////////////////
// midievent

function midievent(delta, status)
{ this.next = null;
  this.prev = null;
  this.delta = delta;
  this.status = status;
  this.data = 0;
  this.arg = 0;
  this.pos = 0;
  this.start = 0;
  this.end = 0;
  this.text = "";

  this.parse = function(start, end)
  { var x;
    var xlen;
    var xtype;

    this.pos = start;
    this.start = start;

    x = (this.status & 240) / 16;
    if( x == 8){
      runningstatus = this.status;
// debugmsg(this.start, this.pos+3 - this.start, "Off ");
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+3;
    }else if( x == 9){
      runningstatus = this.status;
// debugmsg(this.start, this.pos+3 - this.start, "On ");
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+3;
	  if( this.arg == 0){
	    this.status = (this.status & 15) | 128;  // 9x -> 8x
	  }
    }else if( x == 10){
// debugmsg(this.start, this.pos+3 - this.start, "After "+this.status+" "+data[this.pos+1]+" "+data[this.pos+2]);
      runningstatus = this.status;
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+3;
    }else if( x == 11){
// debugmsg(this.start, this.pos+3 - this.start, "CC ");
      runningstatus = this.status;
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+3;
    }else if( x == 12){
// debugmsg(this.start, this.pos+2 - this.start, "Program "+this.status+" "+data[this.pos+1]);
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+2;
    }else if( x == 13){
// debugmsg(this.start, this.pos+2 - this.start, "Chan Pressure "+this.status+" "+data[this.pos+1]);
      runningstatus = this.status;
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+2;
    }else if( x == 14){
// debugmsg(this.start, this.pos+3 - this.start, "Bend "+this.status+" "+data[this.pos+1]+" "+data[this.pos+2]);
      runningstatus = this.status;
	  this.data = data[this.pos+1];
	  this.arg = data[this.pos+2];
      this.pos = this.pos+3;
    }else if( x == 15){
      if( this.status == 255){
		this.pos++;
		xtype = data[this.pos++];
		this.data = xtype;
		xlen = this.getvlen();
		this.arg = xlen;

		if( xtype == 9 || xtype == 3 || xtype == 1 || xtype == 4){
			  var amsg="";
			  var i;
			  for(i = this.pos; i < this.pos+xlen; i++){
				amsg += String.fromCharCode(data[i]);
			  }
			  this.text = amsg;
//	debugmsg(this.start, this.pos+xlen - this.start, amsg);
		}else if( xtype == 81){
			// tempo
			this.arg = (data[this.pos]*256 + data[this.pos+1])*256 + data[this.pos+2];
		}else {
//	debugmsg(this.start, this.pos+xlen - this.start, "Meta "+xtype+" "+xlen);
		}

        this.pos += xlen;
      }else if( this.status == 240){
        this.pos++;
        xlen = this.getvlen();
// debugmsg(this.start, this.pos+xlen - this.start, "SYSEX "+xlen);
        this.pos = this.pos + xlen;
      }else if( this.status == 247){	// F7 
        this.pos++;
        xlen = this.getvlen();
// debugmsg(this.start, this.pos+xlen - this.start, "SYSEX continuation/escape"+xlen);
        this.pos = this.pos + xlen;
      }
    }else {
// debugmsg(this.start, this.pos+2 - this.start, "Running status "+runningstatus+" "+this.status);
	  this.status = runningstatus;
      this.data = data[this.pos];
      this.arg = data[this.pos+1];
	  n = (runningstatus & 240) / 16;
	  if( n == 8 || n == 9 || n == 10 || n == 11 || n == 14){
	      this.pos = this.pos+2;
	  }else if(n == 12 || n == 13){
	      this.pos = this.pos+1;
	  }
    }


	this.end = this.pos;
    return this.pos;
  }

  this.getvlen = function()
  { var n = data[this.pos];
    var ret = n & 127;
    
    this.pos++;
    while( n & 128){
      ret = ret * 128;
      n = data[this.pos];
      ret = ret + (n & 127);
      this.pos++;
    }
      
    return ret;
  }

}

////////////////////////////////////////////////////////
// Filter
// used to filter track data
//
function filter()
{	this.output = 0;	// which output option.
	this.notes = 0;
	this.bend = 0;
	this.cc = 0;
	this.next = null;
	this.prev = null;
	this.num = 0;

	this.showfilter = function()
	{
		return "<tr><td>A filter</td></tr>\n";
	}


}


/////////////////////////////////////////////////////////
// track

function track()
{ this.start = 0;
  this.eventlist = null;
  this.next = null;
  this.prev = null;
  this.pos = 0;
  this.end = 0;
  this.track = 0;
  this.name = "";
  this.hasnotes = 0;
  this.code = "";
  this.notelist = null;
  this.poly = 0;
  this.vals = ["C", "CS", "D", "DS", "E", "F", "FS", "G", "GS", "A", "AS", "B"];
  this.low = 128;	// for range
  this.high = 0;
  this.clow = 128;
  this.chigh = 0;
  this.lastout = 0;
  this.showfunc = 0;	// what display function is current
  this.filterlist = null;
  this.edit = 0;
  this.tempo = 0;

  this.getvlen = function()
  { var n = data[this.pos];
    var ret = n & 127;
    
    this.pos++;
    while( n & 128){
      ret = ret * 128;
      n = data[this.pos];
      ret = ret + (n & 127);
      this.pos++;
    }
      
    return ret;
  }

  this.noteout = function( note, len)
  {	var n = note % 12;
    var o = Math.floor(note / 12);

	return "NOTE_"+this.vals[n]+"("+(o-1)+","+len+")\n";

  }

  this.noteout2 = function( note)
  {	var n = note % 12;
    var o = Math.floor(note / 12);

	return "N_"+this.vals[n]+"("+(o - 1)+")";

  }

  this.outsilence = function(len)
  {
	return "NOTE_S("+len+")\n";
  }

  this.addnote = function( note, vel, chan, now)
  {	var n = new notes(note, vel, chan, now);
	var poly = 1;
	var nl;

	if( this.notelist == null){
	  this.notelist = n;
	  return 1;
	}
	nl = this.notelist;
	poly = 2;	// atleast 2
	while( nl.next != null){
		poly++;
		nl = nl.next;
	}
	nl.next = n;
	n.prev = nl;

	return poly;
	
  }

  this.endnote = function( note, chan, now)
  {	var nl;
    var msg = "";
    
    nl = this.notelist;
	while( nl != null){
	  if( nl.note == note && nl.chan == chan){
	    // found it. unlink
		if( this.notelist == nl){
		  this.notelist = nl.next;
		  if( nl.next != null){
		    nl.next.prev = null;
		  }
		}else {
		  nl.prev.next = nl.next;
		  if( nl.next != null){
		    nl.next.prev = nl.prev;
		  }
		}
	    return this.noteout( note, now - nl.start);
	  }

	  nl = nl.next;
	}
	return "// "+note+" not found\n";
  }

  this.gencodeorig = function()
  {	var el = this.eventlist;
	var n;
	var start=0;
	var note;
	var now;
	var chan = -1;
	var run = 0;
	var poly = 0;

	this.notelist = null;
	this.poly = 0;

	this.code = "// "+this.name+"\n";
	this.code += "// \n";
	el = this.eventlist;
	note = null;
	now = 0;

	while(el != null){
		n = Math.floor( (el.status & 240) / 16);
		if( n == 8 || (n == 9 && el.arg == 0)){
			// note off;
		    chan = el.status & 15;
  	        now = now+el.delta;
			if( format == 1){
			  if( now > start){
				this.code += " T("+(now - start)+"), ";
			  }
			  start = now;
			  this.code += " O("+el.data+"), ";
			  this.lastout = 3;
			}else {
			  this.code += this.endnote(el.data, el.status & 15, now); // note, chan, now
			}

			start = now;

			if( chan > this.chigh){
			  this.chigh = chan;
			}
			if( chan < this.clow){
			  this.clow = chan;
			}
		}else if( n == 9){
			if( this.lastout == 3){
			  this.code += "\n";
			}
			// note on.
		  chan = el.status & 15;
  	      now = now+el.delta;

		  // adjust range
		  if( el.data < this.low){
		    this.low = el.data;
		  }
		  if( el.data > this.high){
		    this.high = el.data;
		  } 

		  if( this.notelist == null && now > start){
		  // output silence
			this.code += this.outsilence( now - start);
		  }
		  start = now;

		  poly = this.addnote( el.data, el.arg, chan, now);
		  if( poly > this.poly){
			this.poly = poly;
		  }
		  if( format == 1){		// midi on D1
		  // basic note data
 		    this.code += " N("+el.data+"), ";
		  }
		  this.lastout = 1;
		}
		el = el.next;
	}
    if( format == 1){		// midi on D1
      this.code += "\n";
	}
  }

  this.outdelta = function(d)
  {	var msg = "";
    var n;
	var n2;

    if( d < 128){
	  return "T0("+d+"), ";
	}else if( d < 16384){
	  n = Math.floor( d / 128)+128;
	  d = d & 127;
	  return "T1("+n+", "+d+"), ";
	}else {
	  n = Math.floor( d / 128);
	  d = d & 127;
	  n2 = Math.floor( n / 128);
	  return "T2("+(n2+128)+", "+((n & 127)+128)+", "+d+") ";
	}
  }

  // format 2 - midi data (t, event)
  //
  this.gencode = function()
  {	var el = this.eventlist;
	var n;
	var start=0;
	var note;
	var now;
	var chan = -1;
	var run = 0;
	var poly = 0;

	if( format == 0 || format == 1){
	  this.gencodeorig();
	  return;
	}

	this.notelist = null;
	this.poly = 0;

	this.code = "// "+this.name+"\n";
	this.code += "// \n";
	el = this.eventlist;
	note = null;
	now = 0;

	while(el != null){
		n = Math.floor( (el.status & 240) / 16);
		if( n == 8 || n == 9){
		  // note event
		  chan = el.status & 15;
		  if( el.data < this.low){
			this.low = el.data;
		  }
 		  if( el.data > this.high){
			  this.high = el.data;
		  }

		  if( chan < this.clow){
			this.clow = chan;
		  }
 		  if( chan > this.chigh){
			  this.chigh = chan;
		  }
		  this.code += this.outdelta( el.delta);
		  if( n == 8 || el.arg == 0){	// note off.
		    this.code += "NOTE_OFF("+this.noteout2(el.data)+", "+el.arg+", "+chan+"), \n";
			if( poly > 0){
			  poly--;
			}
		  }else {
		    this.code += "NOTE_ON("+this.noteout2(el.data)+", "+el.arg+", "+chan+"), \n";
			poly++;
			if( this.poly < poly){
			  this.poly = poly;
			}
		  }
		}
		el = el.next;
	}
  }

  // track.parseevents
  this.parseevents = function(i, len)
  { var delta = 0;
    var status = 0;
    var ev = null;
    var tmp;
	var el = this.eventlist;
	var n;

    this.pos = i;
    this.end = len+i;

    while( this.pos < this.end){
// debugmsg(this.pos, 8, "Parse events");
       delta = this.getvlen();
       status = data[this.pos];

       ev = new midievent(delta, status);
       if( this.eventlist == null){
         this.eventlist = ev;
       }else {
         tmp = this.eventlist;
         while( tmp.next != null){
           tmp = tmp.next;
         }
         tmp.next = ev;
         ev.prev = tmp;
       }
       this.pos = ev.parse(this.pos, this.end);

    }
// process event list
	el = this.eventlist;
	while(el != null){
	    if( el.status == 255){
			if( el.data == 3){
			  this.name =  el.text+" ";
			}else if( el.data == 81){
			    if( g_tempo == 0){
					g_tempo = el.arg;
				}
				this.tempo = el.arg;
			}
		}
		n = (el.status & 240) / 16;
		if( n == 8 ){
			this.hasnotes=1;
		}else if( n == 9){
			this.hasnotes=1;
		}
		el = el.next;
	}

	if( this.hasnotes != 0){
		// generate some code..
		this.gencode();
	}

  }

  this.shownoteoff = function( time, data, arg)
  { var msg="";

	msg += ""+(time)+" Off("+data+","+arg+") ";
    return msg;
  }

  this.shownoteon = function( time, data, arg)
  { var msg="";

	msg += ""+(time)+" On("+data+","+arg+") ";
    return msg;
  }

  this.shownotecc = function( time, data, arg)
  { var msg="";

	msg += ""+(time)+" CC("+data+","+arg+") ";
    return msg;
  }

  this.shownotebend = function( time, data, arg)
  { var msg="";

	msg += ""+(time)+" Bend("+(data+128*arg)+") ";
    return msg;
  }

  this.showcode = function()
  { var msg="<textarea id='codeedit_"+this.track+"' rows='10' cols='40'>\n";
    var div;

	this.gencode();

    msg += this.code;
	msg += "</textarea>\n";
//	msg += "<input type='button' value='Save' onclick='savecode("+this.track+");'>";

	div = document.getElementById("trackdata"+this.track);
	if( div != null){
		div.innerHTML = msg;
	}
  }

  this.showonoff = function()
  { var msg= "";
    var n;
	var time = 0;
	var curtime = 0;
	var div;
	var el = this.eventlist;
	var prev = 0;
  	
	while(el != null){
	    time += el.delta;
	    n = (el.status & 240) / 16;
		if( n == 9 && el.arg == 0){	// On vel 0 == off
		  n = 8;
		}
		if( prev != n){
			prev = n;
			msg += "<br />\n";
		}
		if( n == 8 ){
		    msg += this.shownoteoff( el.delta, el.data, el.arg);
		}else if( n == 9){
		    if( el.arg == 0){
			    msg += this.shownoteoff( el.delta, el.data, el.arg);
				n = 8;
			}else {
			    msg += this.shownoteon( el.delta, el.data, el.arg);
			}
		}else if( n == 11){
			    msg += this.shownotecc( el.delta, el.data, el.arg);
		}else if( n == 12){
			msg += "Prog("+el.data+") ";
		}else if( n == 14){
			    msg += this.shownotebend( el.delta, el.data, el.arg);
		}else{
		    msg += "Code("+el.status+","+el.data+") ";
		}
		el = el.next;
	}
	div = document.getElementById("trackdata"+this.track);
	if( div != null){
		div.innerHTML = msg;
	}
  }

  this.showhex = function()
  { var msg= "";
	var div;

	msg = hexof( this.start, this.end - this.start);
	div = document.getElementById("trackdata"+this.track);
	if( div != null){
		div.innerHTML = msg;
	}
  }


  this.display = function()
  { var el = this.eventlist;
    var msg = "<td valign='top'>";
	var n=0;
	var time=0;
	var flag = 0;
    
	while(el != null){
	    if( el.status == 255){
			if( el.data == 3){
			  msg += el.text+" ";
			}
		}
		el = el.next;
	}
	
	msg += "</td><td valign='top'>\n";


	if( this.hasnotes != 0){
	    msg += this.poly+"</td><td valign='top'>\n";
		if( this.low != this.high){
		    msg += this.low+"-"+this.high+"</td><td valign='top'>\n";
		}else {
		    msg += this.high+"</td><td valign='top'>\n";
		}
		if( this.clow != this.chigh){
		    msg += this.clow+"-"+this.chigh+"</td><td valign='top'>\n";
		}else {
		    msg += this.chigh+"</td><td valign='top'>\n";
		}
		msg += "<input type='checkbox' onclick='UIplayselect("+this.track+");' "; 
		if( this.hasnotes == 2){
			msg += " checked='checked' ";
		}
		msg += ">";
	}else {
		msg += "</td><td valign='top'>\n";
		msg += "</td><td valign='top'>\n";
		msg += "</td><td valign='top'>\n";
	}
	msg += "</td><td valign='top'>\n";

	msg += "<input type='button' value='None' onclick='UIshowdata("+this.track+", 0);' />";
	msg += "<input type='button' value='Hex' onclick='UIshowdata("+this.track+", 1);' />";
	if( this.hasnotes != 0){
		msg += "<input type='button' value='On/Off' onclick='UIshowdata("+this.track+", 2);' />";
		msg += "<input type='button' value='Code' onclick='UIshowdata("+this.track+", 3);' />";
	}
	msg += "<br /><div id='trackdata"+this.track+"'></div>\n";
	if( this.hasnotes == 2){
		msg += "</td><td valign='top'><input type='button' value='Filter' onclick='UIshowdata("+this.track+", 4);' />";
  	    msg += "<br /><div id='filter_"+this.track+"'></div>\n";
	}

	msg += "</td>\n";

	return msg;
  }

  //////////////////////////////////
  // track.filter
  this.addfilter = function( filt)
  {	var nl;
	var num = 0;

	if( this.filterlist == null){
	  this.filterlist = filt;
	  filt.num = num;
	  return 1;
	}
	nl = this.filterlist;
	num++;	
	while( nl.next != null){
		num++;
		nl = nl.next;
	}
	nl.next = filt;
	filt.prev = nl;
	filt.num = num;

	return num;
	
  }

  this.showfilter = function()
  { var msg= "";
	var div;
	var f = this.filterlist;

	msg = "<table>";
	div = document.getElementById("filter_"+this.track);

	while(f != null){
		msg += f.showfilter();

		f = f.next;
	}


	msg += "</table>\n";
	if( div != null){
		div.innerHTML = msg;
	}
  }
}

function UIplayselect(trk)
{	var t = tracklist;
    var div = document.getElementById( 'results' );
	while(t != null && t.track != trk){
		t = t.next;
	}
	if( t != null && div != null){
	  if( t.hasnotes ==2){
	    t.hasnotes = 1;
		displaychunk(div);
	  }else {
	    t.hasnotes = 2;
		displaychunk(div);
	  }
	}

}

function UIshowdata(trk, func)
{	var t = tracklist;

	while(t != null && t.track != trk){
		t = t.next;
	}
	if( t != null){
		t.showfunc = func;
	    if( func == 2){
			t.showonoff();
		}else if( func == 1){
			t.showhex();
		}else if( func == 3){
			t.showcode();
		}else if( func == 4){
			t.showfilter();
		}else if( func == 0){
			div = document.getElementById("trackdata"+trk);
			if( div != null){
				div.innerHTML = "";
			}
		}
	}
}

function savecode(trk)
{	var t = tracklist;
	var div;

	while(t != null && t.track != trk){
		t = t.next;
	}
	if( t != null){
		div = document.getElementById("codeedit_"+trk);
		if( div != null){
		  t.code = div.value;
		}
	}
}



function parsetrack(i, len)
{	var t = new track();
	var tmp;
	var n=0;

	if( tracklist == null){
	  tracklist = t;
	}else {
      n = n+1;
	  tmp = tracklist;
      while(tmp.next != null){
	        n = n+1;
            tmp = tmp.next;
	  }
	  tmp.next = t;
      t.prev = tmp;
	}	
    t.track = n;
	t.start = i;
	t.parseevents(i, len);

	return t;
}

////////////////////////////////////////////////////////////////

function UIsetmode( nmode)
{   var but = document.getElementById( mode );
    if( but != null){
		but.style.backgroundColor="grey";
		but.style.color="black";
    }	

    mode = nmode;
    but = document.getElementById( mode );

    if( but != null){
		but.style.backgroundColor="blue";
		but.style.color="white";
    }	
    displaydata( mode);
}


function displaydata(dmode)
{	var div = document.getElementById( 'results' );

	if( div != null ){
		div.innerHTML="";
	}

	if( datalen <= 0){
		return;
	}

	if( dmode == 'raw'){
		displayraw( div);
	}else if( dmode == 'normal'){
		displaychunk( div );
	}
}

///////////////////////////////////////////////////////////////////
var chunk="";
var miditype=0;
var midinumchunk = 0;

function displayraw( div)
{ var msg="<p>Raw data</p>\n";
  var i,j;
 
  msg += "<table><tr>\n";
  i = 0;
  j = 0;
  for(i=0; i < datalen; i++){
    msg += "<td align='right'>"+data[i]+"</td>";
    j++;
    if( i+1 == datalen){
      msg += "</tr>\n";
    }else if( j == 32){
      j = 0;
      msg += "</tr>\n<tr>";
    }else {
      msg += "";
    }
  }
  msg += "</table>\n";

  div.innerHTML = msg;
}

function hexof( i, len)
{ var ret = "";
  var n;

  for(n=0; n < len; n++){
    k = data[i+n];
    l = k & 15;
    k = (k - l) / 16;
    if( k > 9){
      ret += String.fromCharCode( k + 55);
    }else {
      ret += String.fromCharCode( k + 48);
    }
    if( l > 9){
      ret += String.fromCharCode( l + 55);
    }else {
      ret += String.fromCharCode( l + 48);
    }
    ret += " ";
  }

  return ret;
} 

function displaychunk( div)
{ var msg="";
  var tl;

  msg += "<p></p>\n";
  msg += "<table><tr>\n";
  msg += "<td>Output file format:</td><td>\n";
	msg += "<select id='fileformat' name='format' onchange='UIchangeformat();'>\n";
    msg += "  <option value='0' >Original</option>\n";
    msg += "  <option value='1' >Newer</option>\n";
    msg += "  <option value='2'  selected='selected'>Midi</option>\n";
    msg += "  <option value='3' >Compact</option>\n";
    msg += "  </select>\n";
  msg += "</td></tr>\n<tr>";
  msg += "<td>Midi file type:</td><td>"+miditype+"</td>\n";
  if( g_ppqn != 0){
  msg += "</tr>\n<tr><td>PPQN:</td><td>"+g_ppqn+"</td>\n";
  }else {
  msg += "</tr>\n<tr><td>Millis:</td><td>"+g_millis+"</td>\n";
  }
  msg += "</tr>\n<tr><td>Tempo:</td><td>"+(Math.floor(60000000/g_tempo))+"</td>\n";
  msg += "</tr></table>\n";

  msg += "<table><tr>\n";
  msg += "<th>Name</th><th>Poly</th><th>Range</th><th>Chan</th><th><input type='checkbox' onclick='UIselectall();' /></th><th>Display</th></tr\n<tr>";

  tl = tracklist;
  while( tl != null){
    msg += "<tr>";
    msg += tl.display();
	msg += "</tr>\n";

	tl = tl.next;
  }
//  msg += "<th></th><th></th><th></th>\n";

  msg += "</tr></table>\n";

  msg += "<input type='button' id='addtrack' onclick='UIaddtrack();' value='Add' />\n";
  msg += "<input type='button' id='edittrack' onclick='UIedittrack();' value='Edit'  disabled='disabled'/>\n";
  msg += "<input type='button' id='hidetrack' onclick='UIhidetrack();' value='Hide' disabled='disabled'/>\n";
  msg += "<input style='background-color:red;' type='button' id='recordtrack' onclick='UIrectrack();' value='Record'  disabled='disabled'/>\n";

  div.innerHTML = msg;
}


function parsedata()
{ var i,j, n;
  var trk = null;
  var f = document.getElementById("convertform");

//  format = f.format.value;

startdebug();

  i = 0;
  j = 0;
  while(i < datalen){
    chunk = String.fromCharCode(data[i])+String.fromCharCode(data[i+1])+String.fromCharCode(data[i+2])+String.fromCharCode(data[i+3]);
    j = (((data[i+4]*256)+data[i+5])*256+data[i+6])*256+data[i+7];
    i = i + 8;
    if( j + i > datalen){
	  alert( "Bad length="+j+" for "+chunk);
      i = j + i;
    }else {
// decode chunk type
	  debugmsg(i-8, 14, "Chunk="+chunk+" len="+j); 
      if( chunk == "MThd"){
         miditype = data[i]*256 + data[i+1];
         midinumchunk = data[i+2]*256 + data[i+3];
		 if( (data[i+4] & 128 ) == 128){
			n = 256 - data[i+4];
			// n is frames per second
			g_millis = n * data[i+5];
		 }else {
	         g_ppqn = data[i+4]*256 + data[i+5];
		 }
      }else if( chunk == "MTrk"){
	     trk = parsetrack(i, j);
      }
      i = i + j;
    }
  }
}


function UIaddtrack()
{
}


function UIedittrack()
{
}


function UIhidetrack()
{
}

function UIrectrack()
{
}






//////////////////////////////////////////////////////////////////////

var reqInProgress = 0;
var canNetwork = 1;

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

 // NOTUSED
function playdata(u8data)
{	var xmlhttp = null;
	var inst = this;

	if (window.XMLHttpRequest){// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp=new XMLHttpRequest();
	}else {// code for IE6, IE5
		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	if( xmlhttp == null){
	return;
	}

	xmlhttp.onreadystatechange=function(){
		var start = 0;
		if (xmlhttp.readyState==4){
			if( xmlhttp.status==200){
				var uInt8Array = new Uint8Array(xmlhttp.response);
				if( uInt8Array[0] == 0xef &&
					uInt8Array[1] == 0xbb &&
					uInt8Array[2] == 0xbf){
					start = 3;
				}
			}
			reqInProgress = 0;	// flag that it is over.
		}
		// mark req is done.
	}

	xmlhttp.onerror = function()
	{
		canNetwork = 0;
	}

	xmlhttp.open("POST","1.php",true);
	xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");

	xmlhttp.send("action=play\u0026data="+base64Encode( u8data)+"\u0026raw=" );
	reqmsg = "";
}
// NOTUSEDEND

//////////////////////////////////////////////////////////////////////////////////
// save a copy as midi file to preview
//
function UIsave()
{ var t;
  var len = 0;
  var i, j, cnt = 0;
  var f = document.getElementById("saveform");

  t = tracklist;
  while(t != null ){
	if( t.hasnotes == 2){
	  cnt++;
	  len += t.end-t.start+8;
	}
	t = t.next;
  }

  if( cnt == 0){
    alert("No tracks selected");
	xdebugmsg = "No tracks selected";
	return;
  }

  len += 14;		// for header.

  outdata = new Uint8Array( len);
  for(i = 0; i < 14; i++){
    outdata[i] = data[i];
  }

  t = tracklist;
  while(t != null){
	if( t.hasnotes == 2){
	  f.name.value = t.name;	// use the last name.
	  // copy this data
	  for(j = t.start - 8; j < t.end; j++){
		outdata[i] = data[j];
		i++;
	  }
	}

	t = t.next;
  }

  outdata[11] = cnt;   // number of tracks

  f.data.value = base64Encode( outdata);
  f.action.value = "save";
  f.submit();
}

// find player object
//
function findplayer()
{	var ll;
	var scene;
  scene = findscenebyname("keyboard");
  if( scene != null){
	ll = scene.ctrllist.head;
	while(ll != null){
		if( ll.ob.target == "player"){
			return ll.ob;
		}
		ll = ll.next;
	}
	return null;
  }

}

function UIplayit()
{ var t;
  var len = 0;
  var i, j, cnt = 0;
  var div = document.getElementById( 'results' );
  var scene = null;
  var player = findplayer();

  if( player == null){
	xdebugmsg2 = "player not found";
	return;
  }

  t = tracklist;
  while(t != null ){
	if( t.hasnotes == 2){
	  cnt++;
	  len += t.end-t.start+8;
	}
	t = t.next;
  }

  if( cnt == 0){
  // select all tracks
	  t = tracklist;
	  while(t != null ){
		if( t.hasnotes == 1){
			t.hasnotes = 2;
		}
		t = t.next;
	  }

	  displaychunk( div);
//    alert("No tracks selected");
  }
	player.setvalue("play", 1);		// send play

}

function UIstopit()
{  var player = findplayer();

  if( player == null){
	xdebugmsg2 = "player not found";
	return;
  }
	player.setvalue("play", 0);

	showPlayButton();
	nowcount = 0;
}

////////////////////////////////////////////////////////////////////
// outputoptions object
//

function outputoptions()
{ this.format = 1;
  this.notes = 1;
  this.bend = 0;
  this.cc = 0;
  this.number = 0;
  this.next = null;
  this.prev = null;

  this.outopts = function()
  { var msg = "";
	
	msg += "<td><select id='convertsel_"+this.number+"' name='format' onchange='UIchangeoptformat("+this.number+");'>\n";
    msg += "  <option value='0' "+this.selformat(0, this.format)+">&nbsp;</option>\n";
    msg += "  <option value='1' "+this.selformat(1, this.format)+">Oscillator on A5</option>\n";
    msg += "  <option value='2' "+this.selformat(2, this.format)+">Oscillator on A9</option>\n";
    msg += "  <option value='3' "+this.selformat(3, this.format)+">Send keycodes</option>\n";
    msg += "  <option value='4' "+this.selformat(4, this.format)+">Send Midi on D1</option>\n";
//    msg += "  <option value='5' "+this.selformat(5, this.format)+">Use tone function</option>\n";
    msg += "  </select>\n";
    msg += "  </td>\n";

    return msg;
  }

  this.ischecked = function(a)
  {
	if( a == 1){
	  return "checked='checked' ";
    }
	return "";
  }

  this.selformat = function(a, b)
  {
	if( a == b){
	  return "selected='selected' ";
    }
	return "";
  }

  this.outcode = function()
  {	
	return "  "+this.format+" ,\n";
  }

}

function addoutputopt()
{ var o = new outputoptions();
  var n = 0;
  var t = outputlist;

	if( outputlist == null){
	  outputlist = o;
	}else {
      n = n+1;
	  t = outputlist;
      while(t.next != null){
	        n = n+1;
            t = t.next;
	  }
	  t.next = o;
      o.prev = t;
	}
	o.number = n;

	displayoutputoptions();
}

function deloutputopt(n)
{ var ol = outputlist;
  var i = 0;
  
  while(ol != null){
    if( ol.number == n){
	  if( ol.prev != null){
	    ol.prev.next = ol.next;
	  }
	  if( ol.next != null){
	    ol.next.prev = ol.prev;
	  }
	  // ol is unlinked.
	  // renumber rest
	  i = n;
	  ol = ol.next;
	  while(ol != null){
	    ol.number = i;
		i++;
		ol = ol.next;
	  }
	  displayoutputoptions();
	  return;
	}
    ol = ol.next;
  }
}

function displayoutputoptions()
{ var f = document.getElementById('outputopts');
  var msg = "";
  var ol;

  if( f == null){
	return;
  }

  msg += "<form id='convertform' method='POST' action='1.php' enctype='multipart/form-data'>\n";
  msg += "<table><tr><th>Action</th><th>Output</th></tr>\n";
  msg += "<tr><td><input type='button' value='Convert' onclick='doconvert();' /></td>\n";

  ol = outputlist;
  msg += ol.outopts();
  ol = ol.next;

  while(ol != null){
    msg += "<tr><td><input type='button' value='-' onclick='deloutputopt("+ol.number+");' /></td>";
    msg += ol.outopts();
	msg += "</tr>\n";
	ol = ol.next;
  }
  msg += "<tr><td><input type='button' value='+' onclick='addoutputopt();' /></td></tr>\n";

  msg += "</table>\n";
  msg += "<input type='hidden' name='action' value='save' />\n";
  msg += "<input type='hidden' name='name' value='' />\n";
  msg += "<input type='hidden' name='data' value='' />\n";
  msg += "</form>\n";

  f.innerHTML = msg;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////

function doconvert()
{ var t;
  var len = 0;
  var i, j, cnt = 0;
  var f = document.getElementById("convertform");
  var msg = "// Midi to Arduino by Peter Churchyard (@codewizard58)\n";
  var typ;
  var cnt = 0;

  t = tracklist;
  while(t != null ){
	if( t.hasnotes == 2){
	  cnt++;
	}
	t = t.next;
  }

  if( cnt == 0){
    alert("No tracks selected");
	xdebugmsg = "No tracks selected";
	return;
  }

  msg += "// this file was generated from http://moddersandrockers.com/littlebits/midi\n";
  msg += "\n\n#include <avr/pgmspace.h>\n";
  msg += "#include \"play.h\"\n";
  msg += "#include \"miditune.h\"\n";

  msg += "\n// The following are generated by midi.js\n";
  msg += "int format = "+format+";\n";
  if( format == 0){
    msg += "#define FORMAT_ORIG 1\n";
  }else if( format == 1){
    msg += "#define FORMAT_NEW 1\n";
  }else if(format == 2){
    msg += "#define FORMAT_MIDI 1\n";
  }else {
    msg += "#define FORMAT_COMPACT 1\n";
  }
  msg += "unsigned long tempo_us="+g_tempo+";\n";
  msg += "int ppqn = "+g_ppqn+";\n";
  msg += "\n// 1 - Oscillator on A5\n// 2 - Oscillator on A9\n// 3 - Send keycodes\n// 4 - Send Midi on D1\n";
  msg += "//\n\n";

  msg += "int outopts[] = {\n";
  t = outputlist;
  while(t != null){
  	msg += t.outcode();
	t = t.next;
  }
  msg += "  0\n};\n";

  msg += "\n\nconst unsigned char PROGMEM tune_1[] = {\n";

  t = tracklist;
  while(t != null){
	if( t.hasnotes == 2){
	  // copy this data
	  msg += t.code;
	}

	t = t.next;
  }

  msg += "// end of tune\n";
  msg += "  0,0\n";
  msg += "};\n";

  f.data.value = msg;
  f.name.value = "miditune.ino";

  f.submit();
}

function UIchangeoptformat( n)
{  var f = document.getElementById("convertsel_"+n);
  var t = outputlist;

  while(t != null && t.number != n){
    t = t.next;
  }
  if( t == null){
    return;
  }
//  alert("Found "+n);
  t.format = parseInt(f.value);

  if( t.format != format){
	format = f.value;	// format changed, recalculate
	t = tracklist;
	while(t != null){
	  if( t.hasnotes > 0){
		t.gencode();    // format changed
//		alert("gencode("+t.name+")" );
	  }

  	  t = t.next;
	}
  }

}


function dochangenotes( n)
{  var f = document.getElementById("notessel_"+n);
  var t = outputlist;

  while(t != null && t.number != n){
    t = t.next;
  }
  if( t == null){
    return;
  }
//  alert("Found notes"+n);
  t.notes = parseInt(f.value);

}

function dochangebend( n)
{  var f = document.getElementById("bendsel_"+n);
  var t = outputlist;

  while(t != null && t.number != n){
    t = t.next;
  }
  if( t == null){
    return;
  }
//  alert("Found bend "+n);
  if( f.checked ){
	t.bend = 1;
  }else {
    t.bend = 0;
  }

}


function dochangecc( n)
{  var f = document.getElementById("ccsel_"+n);
  var t = outputlist;

  while(t != null && t.number != n){
    t = t.next;
  }
  if( t == null){
    return;
  }
//  alert("Found CC "+n);

  if( f.checked ){
	t.cc = 1;
  }else {
    t.cc = 0;
  }
}

function UIchangeformat( )
{  var f = document.getElementById("fileformat");
	var n = parseInt( f.value);
	var t = tracklist;
	var sh;

	format = n;

	while(t != null ){
		if( t.hasnotes != 0){
		    sh = t.showfunc;
			if( t.showfunc != 0){
			  UIshowdata(t.track, 0);
			}
			t.gencode();
			UIshowdata(t.track, sh);
		}
		t = t.next;
	}

	
}

//////////////////////////////////////////////////////////////////////
// play the miditracks
//

function trackPlayer( data)
{	this.next = null;
	this.prev = null;
	this.data = data;
	this.period = 0;
	this.curevent = null;
	if( data.eventlist != null){
		this.period=data.eventlist.delta;
		this.curevent = data.eventlist;
	}
}

object_list.addobj( new objfactory("fileplayer", playerobj) );

playerobj.prototype = Object.create(keyboardobj.prototype);

function playerobj( ctx, parent, x, y, w, h )
{	keyboardobj.call(this, ctx, x, y, w, h);
	this.tracklist = null;
	this.period = 0;
	this.curnote = null;
	this.now = 0;
	this.target = null;
	this.playing = false;
	this.scene = parent;
	this.tickdelta = 0;
	this.nowcount = 0;
	this.tempo = 500000;
	this.ppqn = 192;

	this.stopPlaying = function()
	{
		this.allNotesOff();
		this.tracklist = null;
		this.playing = false;
	}

	this.play = function()
	{	var t;

		this.tracklist = null;
		// create note list
		this.period = 0;

		  t = tracklist;
		  while(t != null ){
			if( t.hasnotes == 2){
			  this.addTrack(t);
			}
			t = t.next;
		  }

		if( g_ppqn != 0){
			this.ppqn = g_ppqn;
			this.tempo = g_tempo;
			this.tickDelta = Math.floor(this.tempo/this.ppqn);
		}

		this.playing = true;
		showStopButton();
		timer_list.addobj(this, null);
	}

	this.addTrack = function(trk)
	{	var t = new trackPlayer(trk);

		t.next = this.tracklist;
		this.tracklist = t;

		if( t.next != null){
			t.next.prev = t;
		}
	}

	this.timer = function()
	{	var tl;
		var flag = false;	// any active tracks?

		if( this.playing == false){
			return false;	// done
		}

		if(  this.tickDelta > 0){
			this.nowcount += 1000*timerval;	// add elapsed time.
			xdebugmsg = "now="+this.nowcount+" timerval="+timerval+" delta="+this.tickDelta;
			while(this.nowcount > this.tickDelta){
				tl = this.tracklist;
				while( tl != null){
					if( tl.period > 0){
						tl.period--;
					}
					while( tl.period <= 0 && tl.curevent != null){
						// output event
						this.outData( tl.curevent);
						tl.curevent = tl.curevent.next;
						tl.period = tl.curevent.delta;
					}
					if( tl.curevent != null){
						flag = true;
					}

					tl = tl.next;
				}
				this.nowcount -= this.tickDelta;
			}
		}
		if( flag == false){
			UIstopit();
			return false;
		}
		return false;
	}

	// output midi event data
	this.outData = function( mevent)
	{	var msg3 = [0,0,0];
		var msg2 = [0,0];
		var x = mevent.status & 0xf0;

		// look for clocks etc


		// bad data check
		if( (mevent.arg & 0x80) == 0x80 ||  (mevent.data & 0x80) == 0x80){
			xdebugmsg = "outData "+mevent.status+" "+mevent.data+" "+mevent.arg;
			mevent.arg = mevent.arg & 0x7f;
			mevent.data = mevent.data & 0x7f;
		}

		if( x == 0x80){
			msg3[0] = mevent.status;
			msg3[1] = mevent.data;
			msg3[2] = mevent.arg;

			this.dosetvalues("key-off", mevent.status&0xf, msg3);
		}else if( x == 0x90){
			msg3[0] = mevent.status;
			msg3[1] = mevent.data;
			msg3[2] = mevent.arg;

			if( mevent.arg == 0){
				msg3[0] = 0x80 | (mevent.status&0xf);
				this.dosetvalues("key-off", mevent.status&0xf, msg3);
			}else {
				this.dosetvalues("key-on", mevent.status&0xf, msg3);
			}

		}else if( x == 0xb0){ // CC
			msg3[0] = mevent.status;
			msg3[1] = mevent.data;
			msg3[2] = mevent.arg;

			this.dosetvalues("CC", mevent.status&0xf, msg3);

		}else if( x == 0xe0){ // Pitch Bend
			msg3[0] = mevent.status;
			msg3[1] = mevent.data;
			msg3[2] = mevent.arg;

			this.dosetvalues("bend", mevent.status&0xf, msg3);

		}else if( x == 0xc0){
			msg2[0] = mevent.status;
			msg2[1] = mevent.data;
			useMIDIout.midi.value.send( msg2);
		}
	}

	this.allNotesOff = function()
	{	var msg = [0xb0, 123, 0];
		var i;

		for(i=0; i < 16; i++){
			msg[0] = 0xb0+i;
			this.dosetvalues("all-notes-off", i, msg);
			useMIDIout.midi.value.send( msg);
		}
	}

	this.loadlocal = function()
	{
	}

	this.setvalue = function(arg, val)
	{
		if( arg == "play"){
			if( val == 1){
				this.play();
			}else if( val == 0){
				this.stopPlaying();
				this.allNotesOff();
			}
		}
	}
}


