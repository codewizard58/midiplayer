//////////////////////////////////////////////////////////////////////////////////////
// keyboard input
//
// id="keyboard" defines the place of the keyboard.
//

var object_list = new objlist();

function findPos( obj)
{	var bodyRect = document.body.getBoundingClientRect(),
		elemRect = obj.getBoundingClientRect();
    return [elemRect.left - bodyRect.left, elemRect.top - bodyRect.top ];
}

function scale( x, y)
{
	return x/y;
}

//////
// support for multiple linkto attributes
// this holds the info for a linkto attribute

function linkfilter( val)
{	this.linkedlist = new objlist();
	this.linkpat= val;	// the filter pattern
	this.linkarg="";
}

//////////////////////////////////////////////////////////////////////////////////
// base keyboard object
//

function keyboardobj(ctx, x, y, w, h)
{	this.name = "";
	this.label= "";
	this.l = x;
	this.r = x+w;
	this.t = y;
	this.b = y+h;
	this.w = w;
	this.h = h;
	this.ctx = ctx;
	this.changed = true;
	this.val = 0;
	this.linklist = null;	// if you link to more than one thing.
	this.style = 0;			// default style.
	this.color = "#c0c0c0";
	this.bgcolor = "#808080";
	this.bordercolor = "";
	this.bgimage = null;
	this.sx = 0;
	this.sy = 0;
	this.msensitivity = 255;
	this.target = null;
	this.test = "";
	this.marked = false;	// used to detect loops in the linktos
	this.vcount = 1;
	this.hcount = 1;
	this.scene = null;		// the scene 
	this.comment = "";
	this.click = false;

	this.Draw = function()
	{
		this.ctx.save();
		if( this.bgcolor != ""){
			this.ctx.fillStyle = this.bgcolor;
			this.ctx.fillRect(this.l, this.r, this.w, this.h);
		}else if( this.bgimage != null){
			this.ctx.drawImage(this.bgimage, 0, 0, this.w, this.h);
		}

		this.ctx.restore();
	}

	this.timer = function()
	{
//		xdebugmsg2 = "keyboardobj timer "+this.name;
		if( this.changed){
			this.Draw();
			this.changed = false;
		}
		return false;
	}

	this.HitTest = function(x, y)
	{	var res = null;
		var i;
		
		if( x >= this.l && x <= this.r &&
		    y >= this.t && y <= this.b){
			res = this;
//			xdebugmsg = "Hit "+x+" "+y;
		}
		return res;	
	}

	this.mouseUp = function( x, y)
	{
	}

	// val is 16 bit internally 0 - 65535
	//
	this.mouseMove = function(mx, my)
	{	
		if( this.scene.selected == this){
			this.val += this.msensitivity*(this.sy - my);
			this.val -= this.msensitivity*(this.sx - mx);
			this.sy = my;
			this.sx = mx;

			if( this.val < 0){
				this.val = 0;
			}
			if( this.val > 65535){
				this.val = 65535;
			}
			this.setvalue(null, this.val);

//			xdebugmsg ="keyobj mouse move";
		}
	}

	this.mouseDown = function(mx, my)
	{	this.sx = mx;
		this.sy = my;
	}

	// default KeyPress handler
	this.KeyPress = function(e, dwn)
	{

	}

	// when changed by user update linked object.
	//
	this.linkto = function(link, linkarg)
	{
		if( this.linked == null){
			this.linked = new objlist();
		}
		this.linked.addobj(link);
		this.linkedarg = linkarg;
//		xdebugmsg2 = "Linkto "+link.target;
	}

	// keyobj.setvalue
	this.setvalue = function( linkarg, val)
	{
		this.val = val;
		this.changed = true;
		this.Draw();
		this.dosetvalue(null, this.val);

//		xdebugmsg = "keyobj "+linkarg+" setvalue "+val;
	}


	// this is so complicated...
	// in the layout table I want it to be obvious
	// but that is not as easy as you would think
	// you can have multiple linkto. The linkarg is matched with the previous linkto.
	// there can be multiple targets for each linkto.
	//
	this.dosetvalue = function( linkarg, val)
	{	var sl, ll;
		var savedarg = linkarg;

		if( this.linklist == null){
			return;
		}

		if( linkarg == ""){
			linkarg = null;
		}

		ll = this.linklist.head;
		while(ll != null){
			if( this.scene == null){
				alert("oops");
			}
			
			if( linkarg == null || this.scene.targetmatch( linkarg, ll.ob.linkpat)){

				// for each linkfilter
				sl = ll.ob.linkedlist.head;
				while( sl != null){
					if( !sl.ob.marked ){
						sl.ob.marked = true;
						if( linkarg == null){
							// use the one from the filter.
							sl.ob.setvalue( ll.ob.linkarg, val);
						}else {
							sl.ob.setvalue( linkarg, val);
						}
						sl.ob.marked = false;
					}
					sl = sl.next;
				}
			}
			ll = ll.next;
		}

	}


	this.setvalues = function( linkarg, chan, val)
	{
		this.val = val;
		this.changed = true;
		this.Draw();
//		xdebugmsg = "keyobj "+linkarg+" setvalues "+val[0];
	}

	this.dosetvalues = function( linkarg, chan, val)
	{	var sl, ll;
		var savedarg = linkarg;

		if( this.linklist == null){
			return;
		}

		ll = this.linklist.head;
		while(ll != null){
			if( savedarg == null){
				linkarg = ll.ob.linkarg;
			}

			if( this.scene.targetmatch( linkarg, ll.ob.linkarg)){

				sl = ll.ob.linkedlist.head;
				while( sl != null){
					if( !sl.ob.marked ){
						// if linkpat == target ok else 
						//   if linkarg == target
						if( ll.ob.linkpat == sl.ob.target ||
							linkarg == sl.ob.target){
							sl.ob.marked = true;
							sl.ob.setvalues( linkarg, chan, val);
							sl.ob.marked = false;
						}
					}
					sl = sl.next;
				}
			}
			ll = ll.next;
		}
	}

	this.getvalue = function( )
	{
		return this.val;
	}

	this.label = function(label)
	{
		this.label = label;
		this.changed = true;
	}

	this.setcolor = function (color)
	{
		this.color = color;
		this.changed = true;
	}

	this.sensitivity = function(s)
	{
		this.msensitivity = s;
	}

	this.load = function( data, idx)
	{	var args = data[idx+5];
		var name="";
		var val="";

		while(args > 0){
			name = data[idx+6];
			val = data[idx+7];
			if( name == "label"){
				this.label(val);
			}else if( name == "color"){
				this.setcolor(val);
			}else if( name == "name"){
				this.name = val;
			}else if( name == "bgcolor"){
				this.bgcolor = val;
			}else if( name == "bordercolor"){
				this.bordercolor = val;
			}else if( name == "value"){
				this.val = val;
			}else if( name == "linkto"){
				if( this.linklist == null){
					this.linklist = new objlist();
				}
				this.linklist.addobj( new linkfilter(val), null);
			}else if( name == "linkarg"){
				// assume applies to previous linkto..
				this.linklist.head.ob.linkarg = val;
			}else if( name == "target"){
				this.target = val;
			}else if( name == "style"){
				this.style = val;
			}else if( name == "test"){
				this.test = val;
			}else if( name == "bgimage"){
				this.bgimage = new Image();
				this.bgimage.src = val;
			}else if( name == "hcount"){
				this.hcount = val;
			}else if( name == "vcount"){
				this.vcount = val;
			}else {
				this.loadlocal(name, val);
			}

			idx = idx + 2;
			args = args - 2;
		}
	}

	// default loadlocal
	this.loadlocal = function(name, val)
	{
	}

	// output position values as fractions of canvas size.
	// keyboardobj.savepos

	this.savepos = function()
	{	var msg = "";
		
		msg += " "+scale(this.l,this.scene.width)+", "+scale(this.t,this.scene.height)+", "+scale(this.w,this.scene.width)+", "+scale(this.h,this.scene.height)+", ";
		
		return msg;
	}

	this.saveattrs = function()
	{	var msg = "";
		var cnt = 0;
		var ll = null;

		msg += '"value", '+this.val+', ';
		cnt += 2;
		if( this.name != ""){
			msg += '"name", "'+this.name+'", ';
			cnt += 2;
		}
		if( this.label != ""){
			msg += '"label", "'+this.label+'", ';
			cnt += 2;
		}
		if( this.color != "#c0c0c0"){
			msg += '"color", "'+this.color+'", ';
			cnt += 2;
		}
		if( this.bgcolor != "#808080"){
			msg += '"bgcolor", "'+this.bgcolor+'", ';
			cnt += 2;
		}
		if( this.bordercolor != ""){
			msg += '"bordercolor", "'+this.bordercolor+'", ';
			cnt += 2;
		}
		if( this.msensitivity != 255){
			msg += '"sensitivity", '+this.msensitivity+', ';
			cnt += 2;
		}
		if( this.target != null){
			msg += '"target", "'+this.target+'", ';
			cnt += 2;
		}
		if( this.style != 0){
			msg += '"style", '+this.style+', ';
			cnt += 2;
		}
		if( this.test != ""){
			msg += '"test", "'+this.test+'", ';
			cnt += 2;
		}
		if( this.linklist != null){
			ll = this.linklist.head;
			while( ll != null){
				msg += '"linkto", "'+ll.ob.linkpat+'", ';
				cnt += 2;
				msg += '"linkarg", "'+ll.ob.linkarg+'", ';
				cnt += 2;

				ll = ll.next;
			}
		}

		return [cnt, msg];
	}

	this.save = function()
	{
		return "";
	}

	this.savepatch = function()
	{	var msg = "";
		var cnt = 2;
		var sc = "";

		msg += "\"value\", "+this.val+", ";
		msg += "\"name\", \""+this.name+"\", ";
		if( this.scene != null){
			msg += "2, \"scene\", \""+this.scene.scenename+"\", ";
		}else {
			msg += "0, ";
		}

		msg += "\n";
		return msg;
	}

	this.savelocal = function()
	{
		return [0, ""];
	}

	///////////////////////////////////////////
	// getcolors - take string return rgb array
	//
	this.getcolors = function(color)
	{	var red = 255;
		var green = 255;
		var blue = 255;

		if( color == "red"){
			green = 0;
			blue = 0;
		}else if( color == "black"){
			red = 0;
			green = 0;
			blue = 0;
		}else if( color == "green"){
			red = 0;
			green = 255;
			blue = 0;
		}else if( color == "blue"){
			red = 0;
			green = 0;
			blue = 255;
		}else if( color == "white"){
			red = 255;
		}else {
			// convert #rrggbb
		}



		return [ red, green, blue];
	}

	// makecolor

	this.makecolor = function(colors)
	{	var msg = "#";

		msg += this.ashex( colors[0]);
		msg += this.ashex( colors[1]);
		msg += this.ashex( colors[2]);
		
		return msg;
	}

	this.ashex = function(n)
	{	var n2;
		var hexdigits="0123456789abcdef";
		
		n2 = Math.floor( (n & 0xf0) / 16);

		return hexdigits.charAt(n2)+hexdigits.charAt( n & 0x0f);
	}

	this.clicked = function(kbd)
	{
		this.click = true;
	}

	this.unclicked = function()
	{
		this.click = false;
	}
		
}

////////////////////////////////////////////////////////////////////////////////////

var keymap = [
	[ "q", 81 ],
	[ "2", 50 ],
	[ "w", 87 ],
	[ "3", 51 ],
	[ "e", 69 ],
	[ "r", 82 ],
	[ "5", 53 ],
	[ "t", 84 ],
	[ "6", 54 ],
	[ "y", 89 ],
	[ "7", 55 ],
	[ "u", 85 ],
	[ "i", 73 ],
	[ "9", 57 ],
	[ "o", 79 ],
	[ "0", 48 ],
	[ "p", 80 ],


	[ "", 0 ]
];


/////////////////////////////////////////////////////////////////
//
// 

function keyboard(layout, scenename)
{	this.ctrllist = new objlist();
	this.ctx = ""; // flag init state..
	this.mx=0;
	this.my=0;
	this.cnvs = null;
	this.width = 0;
	this.height = 0;
	this.sx = 0;
	this.sy = 0;
	this.selected = null;
	this.left = 0;
	this.top = 0;
	this.bgimage = null;
	this.bgcolor = "";
	this.imagesize=800;
	this.scale = null;
	this.bend = 0;		// pitch bend or glissando?
	this.removelist = new objlist();	// used to temp remove controls.
	this.slowtimer = 0;
	this.layout = layout;
	this.scenename = scenename;
	this.scene = null;		// the canvas for this scene...
	this.clicked = null;	// last control clicked on

///////////////////////////////////////////////////////////
//
	this.loadcontrols = function( data, idx)
	{	var obj="";
		var x, y, w, h;
		var s;
		var ol = null;
		var cl = null;
		var tmp;

		while( data[idx] != ""){
			obj = data[idx];
			if( data[idx+1] == "coords" ){
				x = data[idx+2][0];
				y = data[idx+2][1];
				w = data[idx+2][2];
				h = data[idx+2][3];
			}else {
				x = data[idx+1];
				y = data[idx+2];
				w = data[idx+3];
				h = data[idx+4];
			}
			if( this.scale == "relative"){
				x = x * this.width;
				y = y * this.height;
				w = w * this.width;
				h = h * this.height;
			}

			ol = object_list.head;
			while( ol != null){
				if( ol.ob.istype( obj) ){
					tmp = ol.ob.create(this.ctx, this, x, y,  w, h);
					tmp.load( data, idx);
	
					this.ctrllist.addobj( tmp, null);
					ol = null;
				}else {
					ol = ol.next;
				}
			}

			idx = data[idx+5]+idx+6;
		}
		this.ctrllist.reverse();
	}

	this.initctrls = function()
	{	var tmp, tmp1;
		var d = document.getElementById(this.scenename);
		var msg = "";
		var keywidth;
		var keyheight;
		var ret;
		var target;
		var ll;
		var cnt = 0;

//		xdebugmsg = "Init keyboard";
		if( !d ){
			return false;
		}

		ret = this.initcanvas(d);
		if( !ret ){
			return false;
		}
		this.ctx = this.cnvs.getContext('2d');

		this.ctx.font="12px Georgia";

		this.loadcontrols( this.layout, 0);

		// post load
		// match the linkto with the targets
		//
		tmp = this.ctrllist.head;
		while(tmp != null){
			if( tmp.ob.name == ""){
				tmp.ob.name = "#"+cnt;
				cnt = cnt+1;
			}	
			if( tmp.ob.linklist != null){
				ll = tmp.ob.linklist.head;
				while(ll != null){
					target = ll.ob.linkpat;	// what we want to link to.

					// find the target. find all matching targets
					tmp1 = this.ctrllist.head;
					while( tmp1 != null){
						if( this.targetmatch(tmp1.ob.target, target) ){
							ll.ob.linkedlist.addobj(tmp1.ob, null);
						}
						tmp1 = tmp1.next;
					}

					ll = ll.next;
				}
			}
			tmp = tmp.next;
		}
		
		this.Draw();

		// init the linked values
		tmp = this.ctrllist.head;
		while(tmp != null){
			if( tmp.ob.linked != null){
				tmp.ob.dosetvalue( tmp.ob.linkedarg, tmp.ob.val);
//				xdebugmsg2 = "LINK "+tmp.ob.name+" "+tmp.ob.linkedarg+" "+tmp.ob.linked.target;
			}
			tmp = tmp.next;
		}
		
		return true;
	}

	this.initcanvas = function(d)
	{	var msg="";
		this.cnvs = document.getElementById(this.scenename+"_canvas");

		this.width = parseInt( d.style.width);
		this.height= parseInt( d.style.height);

		if( !this.cnvs && this.ctx == ""){
			  msg += "<div id='canvasbox'><canvas width='"+this.width+"' height='"+this.height+"' id='"+this.scenename+"_canvas' tabindex='1' ></canvas></div>\n";

			  d.innerHTML = msg;
			  ctx = null;		// signal canvas written
			return false;
		}
		this.scene = this.cnvs;					// various UI actions have the canvas as 'this' findscene() matches the action 'this' with this.scene
		this.cnvs.onmousedown = this.MouseDown;
		this.cnvs.onmousemove = this.MouseMove;
		this.cnvs.onmouseup = this.MouseUp;
		this.cnvs.ondblclick = this.DblClick;
		this.cnvs.onkeyup = this.KeyUp;
		this.cnvs.onkeydown = this.KeyDown;

		this.cnvs.addEventListener('touchstart', 
			function(e){
				var touchobj;
				var kbd = findscene(this);

				if( 1 == e.targetTouches.length){
					touchobj = e.targetTouches[0];
					kbd.mx = Math.floor(touchobj.pageX)-kbd.left;
					kbd.my = Math.floor(touchobj.pageY)-kbd.top;
				xdebugmsg = "Touch start "+kbd.mx+" "+kbd.my;

					kbd.doMouseDown();
					e.preventDefault();
				}
			}, false);
 
		this.cnvs.addEventListener('touchmove', function(e){
				var touchobj;
				var kbd = findscene(this);

				if( 1 == e.targetTouches.length){
					touchobj = e.targetTouches[0];
	//				mx = parseInt(touchobj.pageX);
	//				my = parseInt(touchobj.pageY);
					kbd.mx = Math.floor(touchobj.pageX)-kbd.left;
					kbd.my = Math.floor(touchobj.pageY)-kbd.top;
					kbd.doMouseMove();
				xdebugmsg = "Touch move "+kbd.mx+" "+kbd.my;
					e.preventDefault();
				}
			}, false);
 
		this.cnvs.addEventListener('touchend', function(e){
				var touchobj;
				var kbd = findscene(this);

					kbd.doMouseUp();		// use last x,y
				xdebugmsg = "Touch end "+kbd.mx+" "+kbd.my;
					e.preventDefault();
			}, false);
 
		this.findpos();
		return true;
	}

	this.findpos = function()
	{
		var pos = findPos( this.cnvs);
		this.left = pos[0];
		this.top = pos[1];
	}

	// used as part of the layout loader.
	this.findtarget = function(obj)
	{	var cl = this.ctrllist.head;

		while( cl != null){
			if( cl.ob == obj){
				return cl.ob.target;
			}
			cl = cl.next;
		}
		return "NOTFOUND";
	}

	// targetmatch
	// first arg is the target value in the object
	// 2nd arg is the linkto pattern
	// if exact match then return true.
	// if target has a minus sign only match up to the minus.
	//  EG CC-21 matches CC
	//

	this.targetmatch = function(target, pat)
	{	var len;
		var len2;
		var i;

		if( target == null || pat == null){
			return false;
		}

		if( target == pat){
			return true;
		}
		len = target.length;
		len2= pat.length;
		
		if( len2 > len){
			return false;
		}
		
		i = 0;
		while( i < len2){
			if( target.charAt(i) != pat.charAt(i)){
				return false;
			}
			i++;
		}
		return true;
	}

// timer
// this runs the keyboard creation and run time actions
//
	this.timer = function()
	{	var cl;
		var d;

//	xdebugmsg = "keyboard.timer";

		if( this.cnvs == null){
			this.initctrls();

			return false;
		}

		d = document.getElementById(this.scenename);
		if( d == null){
			return false;
		}

		cl  = this.ctrllist.head;
		while( cl != null){
//			xdebugmsg = "Tick "+cl.ob.name;
			if( cl.ob.timer( cl.data) ){
				this.ctrllist.removeobj( cl);
			}
			cl = cl.next;
		}

		this.slowtimer++;
		if( this.slowtimer == 20){
			this.slowtimer = 0;
			this.findpos();
		}
		return false;
	}

	this.getXY = function(e) {
		var rc = e.target.getBoundingClientRect();
		this.mx = Math.floor(e.clientX - rc.left);
		this.my = Math.floor(e.clientY - rc.top);
		if (this.mx < 0) this.mx = 0;
		if (this.my < 0) this.my = 0;

	//	xdebugmsg="mx="+this.mx+" my="+this.my;
	}

	// kbd.Draw
	//
	this.Draw = function()
	{
		this.ctx.save();

		if( this.bgcolor != ""){
	        this.ctx.fillStyle = this.bgcolor;
		    this.ctx.fillRect( 0 ,  0, this.width, this.height);
		}

		if( this.bgimage != null){
			this.ctx.drawImage(this.bgimage, 0, 0, this.width, this.height);
		}
		this.ctx.restore();
	}

// these event routines are called with canvas as this.
// so they use kbd var to get instance.

    this.doMouseDown = function() {
	   var ol = this.ctrllist.head;
	   var hit;

		this.cnvs.focus();

	   while(ol != null){
			hit = ol.ob.HitTest(this.mx, this.my);
			if( hit != null ){
				this.selected = ol.ob;
				this.sx = this.mx;
				this.sy = this.my;

				ol.ob.mouseDown(this.mx, this.my);
				ol.ob.clicked(this);
				ol = null;
			}else {
				ol = ol.next;
				if( ol == null){
					this.unclicked();
				}
			}
	   }
	   // scale
	   if( this.scale == "relative"){
	   xdebugmsg = "X="+(this.mx/this.width)+" Y="+(this.my/this.height);
	   }else {
	   xdebugmsg = "X="+this.mx+" Y="+this.my;
	   }
        return false;
    }

    this.MouseDown = function(e) {
		var kbd = findscene(this);
        kbd.getXY(e);

		return kbd.doMouseDown();
	}

	// keyboard.doMouseMove
    this.doMouseMove = function() 
	{	var hit = null;
		var sel = null;

//		xdebugmsg2 = "kbd:doMove "+kbd.mx+" "+kbd.my;
		showdebug();
		if( this.selected != null){
			this.selected.mouseMove(this.mx, this.my);
			return;
		}
    }

    this.MouseMove = function(e) {
		var kbd = findscene(this);
        kbd.getXY(e);
		return kbd.doMouseMove();
	}

    this.doMouseUp = function() 
	{
		if( this.selected != null){
			this.selected.mouseUp(this.mx, this.my);
		}
		this.selected = null;
    }

    this.MouseUp = function(e) {
		var kbd = findscene(this);
        kbd.getXY(e);
		kbd.doMouseUp();
	}

    this.DblClick = function(e) {
		var kbd = findscene(this);
    }

	// sketch.KeyDown
    this.KeyDown = function(e) {
		var kbd = findscene(this);
        if (document.activeElement == document.getElementById(kbd.scenename+"_canvas")) {
            return kbd.KeyPress(e.keyCode, 1);
        }
		return true;
    }

    this.KeyUp = function(e) {
		var kbd = findscene(this);
        if (document.activeElement == document.getElementById(kbd.scenename+"_canvas")){
	        return kbd.KeyPress(e.keyCode, 0);
		}
		return true;
    }

    this.KeyPress = function(key, up) {
		var k =0;
		var ol ;
		var code = "";

		while( keymap[k][1] != 0){
		    if( keymap[k][1] == key){
				code = keymap[k][0];
				break;
			}
			k++;
		}
		xdebugmsg = "code='"+code+"' up="+up+" key="+key;
		if( code != ""){
			ol = this.ctrllist.head;
			while(ol != null){
				ol.ob.KeyPress(code, up);
				ol = ol.next;
			}
			return false;
		}
		return true;
    }

	// build a new string that has the layout info from the ctrllist.head
	//
	this.getlayout = function()
	{	var cl = this.ctrllist.head;
		var msg = "";
		var attrs;

		while(cl != null){
			msg += cl.ob.save();

			cl = cl.next;
		}
		return msg;
	}

	this.getpatch = function(patchname)
	{	var cl = this.ctrllist.head;
		var msg = "\"patch\", \""+patchname+"\", 0, 0, 0, \n";
		var attrs;

		while(cl != null){
			msg += cl.ob.savepatch( );

			cl = cl.next;
		}
		return msg;
	}

	// find and remove a label by its name.
	//
	this.removebyname = function( name)
	{	var cl = this.ctrllist.head;

		while(cl != null){
			if( cl.ob.name == name){
				// found it.
				this.ctrllist.removeobj( cl);
				return cl.ob;
			}
			cl = cl.next;
		}
		return null;
	}

	// keyboard save
	// this function saves a layout file with .moog extension
	//
	this.save = function()
	{	var msg = "";
		var f = document.getElementById(this.scenename+"_savediv");
		var ff = document.getElementById(this.scenename+"_saveform");

		if( f == null ){
			
			msg = this.getpatch();

			ff = document.getElementById(this.scenename+"_savetext");
			if( ff != null){
				if( ff.style.display == "none")
				{
					ff.style.display="block";

					ff.value = msg;
				}else {
					ff.style.display="none";
				}
			}else {
				alert(msg);
			}
			return;
		}

		if( f.style.display == "none"){

			if( ff != null){
				msg = this.getpatch();
				f.style.display = "block";
				ff.name.value = "patch";
				ff.name.focus();
				ff.data.value = msg;
				ff.action.value="Save Patch";
				ff = document.getElementById(this.scenename+"_savetext");
				if( ff != null){
					ff.style.display="none";
				}
			}
		}else {
			this.restoreobj();		// put back the removed objects
			f.style.display = "none";
		}
	}

	// keyboard save as an html page
	//
	this.saveaspage = function()
	{	var cl = this.ctrllist.head;
		var msg = "";
		var attrs;
		var f = document.getElementById(this.scenename+"_saveform");
		var d = document.getElementById(this.scenename+"_savediv");
		var sn = document.getElementById(this.scenename+"_savenotes");
		var saveaslabel = null;
		var loadlabel = null;


		if( d == null ){
			return;
		}

		if( d.style.display == "none"){
			// remove the SaveAsPage and Load labels..

			saveaslabel = this.removebyname("SaveAsPage");
			loadlabel = this.removebyname("Load");
			
			msg = this.getlayout();

			if( saveaslabel != null){
				this.removelist.addobj(saveaslabel, null);
			}
			if( loadlabel != null)
			{
				this.removelist.addobj(loadlabel, null);
			}
			if( f != null){
				d.style.display = "block";
				sn.style.display = "block";
				sn.innerHTML = "<p>Remember to save the page in a folder that already has the folder images with the two files werkstatt.png and werkstattr.png.";
				sn.innerHTML += "If needed, use the zip below to download them.</p>\n";
				f.name.value = "patch";
				f.data.value = msg;
				f.action.value="saveaspage";
				f.name.focus();
			}else {
				f = document.getElementById(this.scenename+"_savetext");
				if( f != null){
					d.style.display = "block";
					f.value = msg;
				}else {
					alert(msg);
				}
			}
		}else {
			this.restoreobj();		// put back the removed objects

			d.style.display = "none";
			sn.style.display = "none";
		}
	}

	// put back any temp removed controls
	this.restoreobj = function()
	{	var cl; 

		cl = this.removelist.head;
		while( cl != null)
		{	
			this.removelist.removeobj(cl);
			this.ctrllist.addobj(cl.ob, null);

			cl = this.removelist.head;
		}
	}

	// keyboard.savelocal
	this.savelocal = function()
	{	var msg = "";
		var cnt = 0;
		var src,src2;

		if( this.bgimage != null){
			src = this.bgimage.src;
			src2 = src.replace("http://moddersandrockers.com/littlebits/midi/werkstatt/", "");
			msg += '"bgimage", "'+src2+'", ';
			cnt += 2;
		}
		if( this.scale == "relative"){
			msg += '"scale", "relative", ';
			cnt += 2;
		}
		if( this.imagesize != 800){
			msg += '"imagesize", this.imagesize, ';
			cnt += 2;
		}

		return [ cnt, msg ];
	}

	// display the load layout form if hidden else hide it.
	//
	this.loadlayout = function()
	{	var f = document.getElementById(this.scenename+"_loaddiv");
		var ff= document.getElementById(this.scenename+"_loadform");

		if( f == null){
			return;
		}
		if( f.style.display == "none"){
			if( ff == null){
				return;
			}
			f.style.display="block";
			ff.layout.focus();
		}else {
			f.style.display="none";
		}
		xdebugmsg = "Load layout";
	}

	//////////////////////////////////////////////
	// click is like select..
	// used to 'focus' a control.
	//
	this.unclicked = function()
	{
		if( this.clicked != null){
			this.clicked.unclick();
		}
		this.clicked = null;
	}
}


///////////////////////////////////////////////

function UIloadcancel(scenename)
{	var kbd = findscenebyname(scenename);

	kbd.loadlayout();
}

function UIsavecancel(scenename)
{	var f = document.getElementById(scenename+"_savediv");
	var ff = document.getElementById(scenename+"_savenotes");
	var kbd = findscenebyname(scenename);

	if( ff != null){
		ff.style.display = "none";
	}
	if( f != null){
		f.style.display = "none";
	}
	kbd.restoreobj();		// put back the removed objects

}

// save layout data
// update the patchname label if it is there.
//

function UIsubmitsave(scene)
{		var ff = document.getElementById(scene+"_saveform");
		var f = document.getElementById(scene+"_savediv");
		var sn = document.getElementById(scene+"_savenotes");
		var patchname="";
		var l;
		var msg = "";
		var kbd = findscenebyname(scene);
		var cl = kbd.ctrllist.head;
		var cn;

		if( sn != null){
			sn.style.display = "none";
		}

		patchname = ff.name.value;

		while(cl != null){
			if( cl.ob.target == "patchname"){
				cl.ob.name = patchname;
				cl.ob.Draw();
				cl = null;
			}else {
				cl = cl.next;
			}
		}

		msg = kbd.getpatch(patchname);

		kbd.restoreobj();

		f.style.display = "none";

		ff.data.value = msg;
		ff.submit();
}

//////////////////////////////////////////////////////////////////////////////////
object_list.addobj( new objfactory("keyboard", kbdobj) );

kbdobj.prototype = Object.create(keyboardobj.prototype);

function kbdobj(ctx, parent, x, y, w, h)
{
	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;

	this.setvalue = function( linkarg, val)
	{
		if( linkarg == "save" && val == 1){
			this.scene.save();
		}else if( linkarg == "saveaspage" && val == 1){
			this.scene.saveaspage();
		}else if( linkarg == "load" && val == 1){
			this.scene.loadlayout();
		}


		xdebugmsg = "kbdobj "+linkarg+" setvalue "+val;
	}

	this.setvalues = function( linkarg, chan, val)
	{

//		xdebugmsg = "keyobj "+linkarg+" setvalue "+val;
	}


	// load keyboard attributes from layout.
	this.loadlocal = function( name, val)
	{	var kbd = this.scene;

		kbd.bgimage = this.bgimage;
		kbd.bgcolor = this.bgcolor;

		if( name == "bgimage"){
			kbd.bgimage = new Image();
			kbd.bgimage.src = val;
		}else if( name == "imagesize"){
			kbd.imagesize = val;
		}else if( name == "scale"){
			kbd.scale = val;
		}
	}

	// kbdobj.Draw()
	//
	this.Draw = function()
	{	var kbd = this.scene;
		kbd.Draw();
	}

	this.savelocal = function()
	{	var msg = "";
		var cnt = 0;

		return [ cnt, msg ];
		
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"keyboard", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}
}

///////////////////////////////////////////////////////////////////////////////////
////////////  Piano control
///////////////////////////////////////////////////////////////////////////////////


var pianomap = [
	48, "q", 5, 55,		// Q
	49, "2", 15, 0,		// 2
	50, "w", 25, 55,	// W
	51, "3", 35, 0,		// 3
	52, "e", 45, 55,	// E
	53, "r", 65, 55,	// R
	54, "5", 75, 0,		// 5
	55, "t", 85, 55,	// T
	56, "6", 95, 0,		// 6
	57, "y", 105, 55,	// Y
	58, "7", 115, 0,	// 7
	59, "u", 125, 55,	// U
	60, "i", 145, 55,	// I
	61, "9", 155, 0,	// 9
	62, "o", 165, 55,	// O
	63, "0", 175, 0,	// 0
	64, "p", 185, 55,	// P

	0, 0, 0, 0
];


object_list.addobj( new objfactory("piano", pianoobj) );

pianoobj.prototype = Object.create(keyboardobj.prototype);

function pressedkey(note)
{	this.note = note;
}

function pianoobj(ctx, parent, x, y, w, h)
{
	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;
	this.nnotes = 15;		// number of white notes...
	this.nwidth = Math.floor((this.r-this.l - 20) / this.nnotes);
	this.markw = Math.floor( this.nwidth/3 );
	this.markh = Math.floor( (this.b - this.t)/8 );
	this.blktab = [ 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0 ];
	this.shifttab = [ 0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6 ];
	this.state = 0;
	this.parent = parent;
	this.nwidth2 = Math.floor(this.nwidth/2);
	this.nwidth34= Math.floor( 3*this.nwidth/4);
	this.lastnote=0;
	this.dx = 0;
	this.dy = 0;
	this.keylist = new objlist();
	this.curkey = 0;
	this.bend = 0;
	this.octave = 48;
	this.sendchan = 0;	

	// match width with keyboard size.
	this.r = this.l + this.nnotes * this.nwidth+2;
//	return;


	this.DrawNote = function(note, on )
	{	var i;
		var x;
		var blk,bh;
		var n, o;

//		xdebugmsg = "note="+note+" nnotes="+this.nnotes+" markw="+this.markw+" markh="+this.markh;

		if( note < 48 || note > 48+ Math.floor( this.nnotes / 7)*12){
			return;
		}

		this.ctx.save();

		note -= 48;

		n = note % 12;
		o =  ( Math.floor(note / 12) );
		blk = this.nwidth34;

		x = this.l + (this.shifttab[n] + o * 7 ) * this.nwidth - Math.floor(this.markw/2);
		if( this.blktab[n] == 1){
			bh = Math.floor( (this.b-this.t)/2);
			x += this.nwidth;
		}else {
			bh = 5 * Math.floor( (this.b-this.t)/6);
			x += this.nwidth2;
		}

		if( on == 1){
	        this.ctx.fillStyle = "#0000ff";
		}else {
			if( this.blktab[n] == 1){
		        this.ctx.fillStyle = "#000000";
			}else {
		        this.ctx.fillStyle = "#ffffff";
			}
		}

		bh += this.t;
        this.ctx.fillRect( x ,  bh, this.markw, this.markh);
		this.ctx.restore();
	}

	this.Draw = function( )
	{	var i,j;
		var x;
		var blk,bh;

		this.ctx.save();

		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(this.l, this.t, this.r-this.l, this.b-this.t);

		this.ctx.strokeStyle = "#000000";
		this.ctx.lineWidth = 2;
		this.ctx.strokeRect(this.l, this.t, this.nnotes*this.nwidth, this.b-this.t);

		x = this.l;
		for(i=0; i < this.nnotes; i++){
			this.ctx.strokeRect(x, this.t, this.nwidth, this.b-this.t);
			x += this.nwidth;
		}

		x = this.l;
		blk = this.nwidth34;
		bh = Math.floor(2*(this.b-this.t)/3);
		this.ctx.fillStyle = "#000000";
		for(i=0; i < this.nnotes-1; i++){
			j = i % 7;
			if( j != 2 && j != 6 ){
				this.ctx.fillRect(x+blk, this.t, this.nwidth/2, bh);
			}
			x += this.nwidth;
		}

		this.ctx.restore();
	}

	// calculate the note number
	//
	this.findkey = function(x, y)
	{	var ret = 0, bret;
		var nx = x-this.l;
		var ny = y - this.t;
		var k, k7, bk, bk7;
		var b;
		var blk;
		var bh;
		var bl;
		var wnotemap = [ 0, 2, 4, 5, 7, 9, 11, 12];
		var bnotemap = [ 1, 3, 0, 6, 8, 10, 0, 13];

		blk = this.nwidth34;
		bh = Math.floor(2*(this.b-this.t)/3);

		k = Math.floor(nx / this.nwidth);
		k7 = Math.floor(k / 7);
		ret = wnotemap[ k % 7] + k7*12 + this.octave; // default value

		if( ny < bh){	// could be a black key
			nx = nx - this.nwidth34;
			if( nx < 0){
				nx = 0;
			}
			bk = Math.floor(nx / this.nwidth);
			bl = Math.floor(bk*this.nwidth);
//			xdebugmsg = "bl="+bl+" nx="+nx+" r="+(bl+this.nwidth2)+" k="+bk;
			if( nx > bl && nx < (bl+this.nwidth2) ){
				bk7 = Math.floor(bk / 7);
				bret = bnotemap[ bk % 7];
				if( bret != 0){
					ret = bret + this.octave + bk7*12;
				}
			}
		}

		return ret;
	}

	this.mouseUp = function( x, y)
	{	var k = this.findkey(x, y);

		this.noteOff( this.lastnote, 127, this.sendchan);

	}

	this.mouseMove = function(x, y)
	{	var tmp;

		if( this.HitTest( x, y) == this ){
			tmp = this.findkey(x, y);

			if( this.bend == 0){
				if( this.lastnote != tmp){
					this.noteOff( this.lastnote, 127, this.sendchan);

					this.noteOn(tmp, 127, this.sendchan);
					this.lastnote = tmp;
				}
			}
		}
	}

	this.mouseDown = function(x, y)
	{	var k = this.findkey(x, y);
		this.sx = x;
		this.sy = y;

		this.noteOn( k, 127, this.sendchan);
		this.lastnote = k;
	}

	// pianoobj.keypress
	// code is the letter qwertyuiop etc
	this.KeyPress = function( code, dwn)
	{	var i;
		var val;
		var k = 0;

		if( code == this.curkey && dwn == 1){
			return;
		}

//		xdebugmsg ="piano KeyPress "+code+" "+dwn;
		for(i=0; pianomap[i] != 0 ; i += 4){
			if( pianomap[i+1] == code){
				val = pianomap[i];
				if( dwn == 1){
					this.curkey = code;
					this.noteOn(val, 127, this.sendchan);
				}else {
					this.noteOff(val, 127, this.sendchan);
					this.curkey = 0;
				}
				return;
			}
		}
//		xdebugmsg ="not found KeyPress "+code+" "+up;
	}

	this.noteOn = function( note, vel, chan)
	{	var msg3 = [ 0x90, 0, 0];
		

		msg3[0] = 0x90 | (chan & 0x0f);
		msg3[1] = note;
		msg3[2] = vel;

		this.DrawNote( note, 1);

		this.dosetvalues( "key-on", chan, msg3 );

	}

	this.noteOff = function( note, vel, chan)
	{	var msg3 = [ 0x80, 0, 0];
	
		msg3[0] = 0x80 | (chan & 0x0f);
	    msg3[1] = note;
		msg3[2] = vel;

		this.DrawNote( note, 0);

		this.dosetvalues( "key-off", chan, msg3 );

	}


	this.doSave = function()
	{	var msg = "1,";

		return msg;
	}

// piano.doLoad()
	this.doLoad = function(initdata,  idx)
	{	var i = initdata[idx];
	}		
		
	this.setvalue = function(arg, val)
	{
		if( arg == null){
			return;
		}
		if( arg == "bend"){
			this.bend = val;
xdebugmsg2 = "Bend="+val;
		}else if( arg == "sendchan"){
			this.sendchan= val;
		}
	}

	this.setvalues = function(arg, chan, val)
	{	
		xdebugmsg2 = "piano setvalues "+arg;
		if( arg == "key-on")
		{
			this.noteOn( val[1], val[2], val[0] & 0xf);
		}else if( arg == "key-off")
		{
			this.noteOff( val[1], val[2], val[0] & 0xf);
		}else if( arg == "programchange"){
			this.dosetvalues( arg, chan, val );
		}
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"piano", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}
}

////////////////////////////////////////////////////////
//
// labeled indicator
//
object_list.addobj( new objfactory("button", buttonobj) );

buttonobj.prototype = Object.create(keyboardobj.prototype);

function buttonobj( ctx, parent, x, y, w, h )
{	keyboardobj.call(this, ctx, x, y, w, h );
	this.scene = parent;
	this.w2 = Math.floor(this.w/2);
	this.h2 = Math.floor(this.h/2);

	this.color = "#ff0000";

	this.Draw = function()
	{
		this.ctx.save();

		// draw indicator

		this.ctx.fillStyle = this.color;
		if( this.style == 0){
			if( this.val == 0){
				this.ctx.fillStyle = "#000000";
			}
			this.ctx.fillRect( this.l+ this.w2, this.t+ this.h2, 10, 10);
		}else if( this.style == 1){
			this.ctx.fillStyle = this.bgcolor;
			this.ctx.fillRect( this.l,this.t, this.w, this.h);

			if( this.val == 0){
				this.ctx.fillStyle = this.color;
				this.ctx.fillRect( this.l,this.t+this.h2, this.w, this.h2);
			}else {
				this.ctx.fillStyle = this.color;
				this.ctx.fillRect( this.l,this.t, this.w, this.h2);
			}
		}

		this.ctx.restore();
	}

	this.mouseDown = function(mx, my)
	{
		if( this.val == 0){
			this.val = 1;
		}else {
			this.val = 0;
		}
		xdebugmsg2 = "button link "+this.linkedarg+" "+this.val;

		this.dosetvalue(null, this.val);
		this.Draw();
	}

	this.mouseMove = function(x, y)
	{
		xdebugmsg2 = "button move";
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"button", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}

}

/////////////////////////////////////////////////////////
///
/// 
object_list.addobj( new objfactory("rotary", rotaryobj) );
rotaryobj.prototype = Object.create(keyboardobj.prototype);

function rotaryobj(ctx, parent, x, y, w, h)
{
	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;

	this.w2 = Math.floor(w/2);
	this.h2 = Math.floor(h/2);

	this.plen = Math.floor( (this.r-this.l) /3);	// pointer length
	this.cx = this.l+ this.w2;	// center x
	this.cy = this.t+ this.h2;
	this.deg = Math.PI/180;

	this.Draw = function()
	{	var v = Math.floor(this.val/256);
	
		this.ctx.save();

		this.ctx.fillStyle = this.bgcolor;
		this.ctx.fillRect(this.l, this.t, this.w, this.h);

		if( this.bordercolor != ""){
			this.ctx.strokeStyle = this.bordercolor;
			this.ctx.lineWidth = 2;

			this.ctx.strokeRect(this.l, this.t, this.r-this.l, this.b-this.t);
		}

		// draw indicator

		this.ctx.fillStyle = this.color;

		this.ctx.translate( this.cx, this.cy);
		this.ctx.rotate( (v + 135)*this.deg );

		this.ctx.fillRect( -5, -5, 10, 10);

		this.ctx.fillRect( 0, 0, this.plen, 2);

		this.ctx.restore();

	}

	this.setvalues = function( linkarg, chan, val)
	{
		this.setvalue(linkarg, val[2]*512);
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"rotary", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}
}

/////////////////////////////////////////////////////////
object_list.addobj( new objfactory("slider", sliderobj) );

sliderobj.prototype = Object.create(keyboardobj.prototype);

function sliderobj(ctx, parent, x, y, w, h)
{
	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;
	this.kh = Math.floor(h/10);
	this.kh2 = Math.floor( this.kh/2);
	this.kw = Math.floor( (3*(w))/4);
	this.kw2 = Math.floor( this.kw/2);
	this.range = h - 20 - this.kh;
	this.step = (this.range /256);
	this.w2 = Math.floor(w/2);

	this.Draw = function()
	{	var v = Math.floor(this.val/256);

		this.ctx.save();

		if( this.bgcolor != ""){
			this.ctx.fillStyle = this.bgcolor;
			this.ctx.fillRect(this.l, this.t, this.r-this.l, this.b-this.t);
		}

		if( this.bordercolor != ""){
			this.ctx.strokeStyle = this.bordercolor;
			this.ctx.lineWidth = 2;
			this.ctx.strokeRect(this.l, this.t, this.r-this.l, this.b-this.t);
		}

		// draw indicator
		this.ctx.fillStyle = "#000000";
		this.ctx.fillRect(this.l+this.w2-2, this.t+this.kh2, 4, this.range+this.kh);

		this.ctx.fillStyle = this.color;
		this.ctx.fillRect( this.l+this.w2-this.kw2, this.t+Math.floor((256- v )*this.step)+this.kh2,  this.kw, this.kh);

		this.ctx.restore();

	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"slider", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}

}

/////////////////////////////////////////////////////////

object_list.addobj( new objfactory("label", labelobj) );

labelobj.prototype = Object.create(keyboardobj.prototype);

function labelobj(ctx, parent, x, y, w, h)
{	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;

	this.kh = Math.floor(h/10);
	this.kh2 = Math.floor( this.kh/2);
	this.kw = Math.floor( (3*(w))/4);
	this.kw2 = Math.floor( this.kw/2);
	this.range = h - 20 - this.kh;
	this.step = (this.range /256);
	this.w2 = Math.floor(w/2);
	this.h2 = Math.floor(h/2);
	this.tangle = 0;
	this.deg = Math.PI/180;
	this.action = "";

	this.Draw = function()
	{	var v = Math.floor(this.val/256);
		var tx, ty;
		

		this.ctx.save();

		tx = this.l;
		ty = this.t+ this.h2;
		this.ctx.translate( tx, ty);

		if( this.tangle != 0){
			this.ctx.rotate( this.tangle * this.deg);
		}

		if( this.bgcolor != ""){
			this.ctx.fillStyle = this.bgcolor;
			this.ctx.fillRect(0, 0, this.w, this.h);
		}
		if( this.bgimage != null){
			this.ctx.drawImage(0, 0, this.w, this.h);
		}


		this.ctx.fillStyle = this.color;
		this.ctx.fillText(this.label, 5, 15 );

		if( this.bordercolor != ""){
			this.ctx.strokeStyle = this.bordercolor;
			this.ctx.lineWidth = 2;
			this.ctx.strokeRect(0, 0, this.w, this.h);
		}

		this.ctx.restore();

	}

	this.mouseDown = function(x, y)
	{
		this.val = 1;
		this.dosetvalue(null, this.val);
	}

	this.angle = function(a)
	{
		this.tangle = a;
	}
	
	this.loadlocal = function(name, val)
	{
		if( name == "angle"){
			this.tangle = val;
		}
		if( name == "action"){
			this.action = val;
		}
	}

	this.savelocal = function()
	{	var msg = "";
		var cnt = 0;

		if( this.tangle != 0){
			msg += '"angle", '+this.tangle+', ';
			cnt += 2;
		}
		if( this.action != 0){
			msg += '"action", "'+this.action+'", ';
			cnt += 2;
		}

		return [cnt, msg];
		
	}

	this.save = function()
	{	var attrs = this.saveattrs();
		var lattrs= this.savelocal();
		return '"label", '+this.savepos()+(attrs[0]+lattrs[0])+", "+attrs[1]+lattrs[1]+"\n";
	}
}

////////////////////////////////////////////////////////
object_list.addobj( new objfactory("selector", selector) );
selector.prototype = Object.create(keyboardobj.prototype);

function selector(ctx, parent, x, y, w, h)
{	keyboardobj.call(this, ctx, x, y, w, h);
	this.scene = parent;
	this.chans = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
	this.w16 = Math.floor(this.w/16);


	this.Draw = function()
	{	var i;
	var h2 = Math.floor(this.h/2);

		this.ctx.save();
		
		if( this.bgcolor != ""){
			for(i= 0; i < 16; i++){
				this.ctx.fillStyle = this.bgcolor;
				this.ctx.fillRect(this.l+i*this.w16+5, this.t, this.w16-10, this.h);
			}
		}
		for(i= 0; i < 16; i++){
			this.ctx.fillStyle = "black";
			this.ctx.translate(this.l+i*this.w16+5, this.t);
			this.ctx.fillText(""+(i+1), 5, 15 );
			this.ctx.translate(-(this.l+i*this.w16+5), -this.t);
		}
		for(i= 0; i < 16; i++){
			if( this.chans[i] ==0){
				this.ctx.fillStyle = "black";
			}else {
				this.ctx.fillStyle = this.color;
			}
			this.ctx.fillRect( this.l+i*this.w16+10, this.t+h2, 10, 10);
		}

		this.ctx.restore();
	}

	this.mouseDown = function(x, y)
	{	var pos =Math.floor( (x - this.l) / this.w16);

		if( this.chans[pos] != 0){
			this.chans[pos] = 0;
		}else {
			this.chans[pos] = 1;
		}
		this.Draw();
	}

	this.setvalue = function(arg, val)
	{
	}


	this.setvalues = function(arg, chan, val)
	{	var chan;

		if( this.linked != null){
			if( arg == "key-on" || arg == "key-off")
			{
				if( this.chans[ chan ] != 0){
					this.dosetvalues(arg, chan, val);
				}
			}
		}
	}

}

////////////////////////////////////////////////////////
object_list.addobj( new objfactory("indicator", ledobj) );

ledobj.prototype = Object.create(keyboardobj.prototype);

function ledobj( ctx, parent, x, y, w, h )
{	keyboardobj.call(this, ctx, x, y, w, h );
	this.scene = parent;

	this.Draw = function()
	{	var tval;
		var colors;

		this.ctx.save();

		// draw indicator

		colors = this.getcolors( this.color);

		if( this.style == 0){
			tval = this.val /65536;
			colors[0] = Math.floor( colors[0] * tval);
			colors[1] = Math.floor( colors[1] * tval);
			colors[2] = Math.floor( colors[2] * tval);
			this.ctx.fillStyle = this.makecolor(colors);
			this.ctx.fillRect( this.l, this.t, this.w, this.h);
		}else if( this.style == 1){
			this.ctx.fillStyle = this.bgcolor;
			this.ctx.fillRect( this.l,this.t, this.w, this.h);

			ty = this.val / 65535 * this.h;
			this.ctx.fillStyle = this.color;
			this.ctx.fillRect( this.l,this.t+this.h - ty , this.w, ty);
		}

		this.ctx.restore();
	}

	this.setvalue = function( arg, val)
	{
		this.val = val;
//		xdebugmsg2 = "LED "+val;
		this.Draw();
	}

}

////////////////////////////////////////////////////////
object_list.addobj( new objfactory("lfo", lfoobj) );

lfoobj.prototype = Object.create(keyboardobj.prototype);

function lfoobj( ctx, parent, x, y, w, h )
{	keyboardobj.call(this, ctx, x, y, w, h );
	this.scene = parent;

	this.Draw = function()
	{

	}
}

