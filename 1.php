<?php 
  $devmode = 1;
  $seq = 0;
  
  if( $devmode == 1){
    session_start();
    $base = "../..";  // dev

    if( isset( $_SESSION['seq']) ){
      $seq = 1+$_SESSION['seq'];
    }
    $_SESSION['seq'] = $seq;
    $newmidi="midi_".($seq).".js";  // dev
    $oldmidi="midi_".($seq-1).".js";

    copy( "midi.js", $newmidi);

    if( is_file($oldmidi) ){
      unlink($oldmidi);
    }
  }else {
    $base = "..";     // normal
    $newmidi="midi.js";             // normal

  }
  
  
  $loaddata="";
  $midilen = 0;
  $debug = 0;
  $chosenoutput = 0;
  
  $action = "";
  if( isset($_POST['action'] )) {
    $action= $_POST['action'];
  }
  if( $action == "" && isset($_GET['action'] )){
    $action= "get_".$_GET['action'];
  }

  if( $action == "save" ){
    $data = "";
    $name = "";
    if( isset($_POST['data']) ){
  	  $data = $_POST['data'];
    }
    if( isset($_POST['name']) ){
  	  $name = $_POST['name'];
    }
	  // header("Content-type: text/plain");
	  header("Content-disposition: application; filename=$name");
	  echo $data;
    die("");
  }
  
  if( $action == "savelayout" ){
    $data = "";
    $name = "";
    if( isset($_POST['data']) ){
  	  $data = $_POST['data'];
    }
    if( isset($_POST['name']) ){
  	  $name = $_POST['name'];
    }
	  header("Content-type: text/plain");
	  header("Content-disposition: application; filename=$name.txt");
	  echo $data;
    die("");
  }
  if( $action == "Load"){
      $updir ="/tmp/";
      if( !is_dir( $updir) ){
        mkdir($updir);
      }
      $lname = $updir.md5( $_FILES["loadfilename"]["name"].time() ).".mid";

      if( ! move_uploaded_file($_FILES["loadfilename"]["tmp_name"], $lname) ) {
        echo "<p>Load file data to $lname failed!</p>\n";
        die("");
      }

	    $midilen = filesize( $lname);
	    if( $midilen > 0){
  	      $midifile = fopen($lname, "rb");
	      $loaddata = fread($midifile, $midilen);
	      fclose( $midifile);
	    }

        unlink( $lname);
        
      $action="";
      if( isset($_POST['debug']) ){
        $debug = 1;
      }
      if( isset($_POST['chosenoutput']) ){
        $chosenoutput = $_POST['chosenoutput'];
      }
  }
  if( $action == "New" || $action == "get_New" ){
    $action= "";
    $loaddata="";
  }
  
  // this is really the Preview function
  if( $action == "play"){
    $data="";
    $name = "mididata";
    if( isset($_POST['data']) ){
      $data = base64_decode($_POST['data']);
    }
    if( isset($_POST['name']) ){
      $name = $_POST['name'];
    }
    
    header("Content-type: application/binary");
	  header("Content-disposition: application; filename=$name.mid");
    
    echo $data;
    die("");
  }

?>
<head>
</head>
<body onload="process();">
<link rel="shortcut icon" href="$base/images/favicon.ico" type="image/x-icon" />
<link rel="stylesheet" media="all" href="/common.css" type="text/css" />
<link rel="stylesheet" media="all" href="src/src.css" type="text/css" />
  <?php 
  echo "<script type='text/javascript' >\n";
  include "processbase.js";

?>
  // keyboard layout data
  //  [ "objtype", x, y, w, h, xtra ....]
  var keyboard_layout = [
  "keyboard", 0, 0, 0, 0, 2, "target", "canvas",
  "synth", 0, 0, 0, 0, 8, "target", "synth", "linkto", "midiout", "linkarg", "key", "chan", 1, 
  "fileplayer", 0, 0, 0, 0, 6, "linkto","piano", "linkarg","", "target", "player",
  "label", 280, 10, 40, 20, 6, "label", "Save", "color", "#ff0000", "bgcolor","#ffffff",
  "piano", 150, 160, 500, 200, 6, "target", "piano", "linkto", "synth", "linkarg", "key",
  "rotary", 490, 36, 60, 60, 4, "linkto", "synth", "linkarg", "cutoff",
  "midiout", 0, 0, 0, 0, 2, "target", "midiout",
  "midiin", 0, 0, 0, 0, 10, "target", "midiinput", "linkto", "piano", "linkarg", "key", "linkto", "CC", "linkarg", "CC",
  "", 0, 0, 0, 0, 0
  ];
  <?php

  include "keyboard.js";
  echo "</script>\n";
  
?>
<table>
<tr>
<td valign="top">
<div class="menubar">
<h2>&nbsp;</h2>
</div>

<div>
<?php
$currenttab = "softbitslive";
include("$base/../common/littlebits-related.php");
?>
</div>

<div class="menubar">
<h2>Midi File processor for LittleBits Arduino</h2>
</div>

  <div class="box" style="padding:20px;min-width:800" >
      <p>
            This web page was originally written to upload a Midifile (.mid), decode it and convert it to
            code that could be run on an <a href="http://arduino.cc">
              Arduino</a> such as the <a href="http://littlebis.cc">@littlebits</a> one. I have added Web Midi support which works with 
              recent versions of the Chrome web browser. The document for the Web Midi Api is <a href="http://www.w3.org/TR/webmidi/">HERE</a>.
              I also plan to add output to <a href="http://webaudio.github.io/web-audio-api/"> Web Audio Api</a> soon.
            </p>
    
    <p>
      Upload a Midi file and preview the tracks. Select the tracks you want to preview and the click Preview. Preview will build a new .mid
      file and you can save it and then play it. When you have found the track that has the music you want the <a href="http://littlebits.cc">@LittleBits</a>
      <a href="http://arduino.cc">@Arduino</a> to play, select the options and click Convert. To look at the data you can use Raw to see the midi data
      as hex numbers, On/Off displays a basic decode of the midi data and code displays what the note data will look like in the Arduino souce. The source files for the Arduino sketch
      are <a href="#sketch">HERE</a>
    </p>
    
  </div>

  <div class="menubar">
    <h2>Select Midi File</h2>
  </div>

  <div class="box" style="padding:20px;min-width:800" >
<form id="loadform" action="1.php" method="POST" enctype="multipart/form-data">
<table><tr><th style="color:white;">Midi File:</th>
<td>
  <input type="file" name="loadfilename" />
  <input type="hidden" name="chosenoutput" value="0" />  
</td>
</tr>
<tr><td>&nbsp;</td><td><input type="Submit" Name="action" value="Load"></td></tr>
</table>
</form>
</div>

  <div class="menubar">
    <h2>Tracks</h2>
  </div>
  
  <?php
if($midilen > 0){
?>

  <div>
<input type="button" id="normal" onclick="UIsetmode('normal');" value="Normal" />
<input type="button" id="raw" onclick="UIsetmode('raw');" value="Raw" />
  </div>

  <?php
  $i = 0;
  $j = 0;
  
  echo "<script type='text/javascript'>\n";
  
  echo "mididebug=$debug;\n";
  echo "chosenOutput=$chosenoutput;\n";

  echo "data = [\n";
  for( $i=0; $i < $midilen;$i++){
    $val = ord( $loaddata[$i]);
    echo "$val";
    if(  $i+1 == $midilen){
      echo "\n";
    }else if( $j % 16 == 15 ){
      echo ",\n";
    }else {
      echo ", ";
    }
    $j++;
  }
  echo "\n";
  echo "];\n";
  echo "datalen=$midilen;\n";

}else {
  echo "<script type='text/javascript'>\n";
  echo "datalen = 0\n";

}

include "sound.js";
include "midifileplayer.js";
include "midi.js";
echo "</script>\n";

?>
  <script type="text/javascript">
    /////////////////////////////////////////////////////////
    /// in html, id == keyboard defines where the keyboard is placed.
    /// keyboard creates the canvas and inits the layout of
    /// keyboard objects

    // top keyboard
    scene_list.addobj(new keyboard(keyboard_layout, "keyboard"), null);
    timer_list.addobj( scene_list.head.ob , null); // scene_list.head.ob is the keyboard object just added

  </script>


  <div id="results"></div>
  <table>
    <tr>
      <td></td>
      <td>
        <span id="keyboard" style="width:600px;height:400px;"></span>
      </td>
    </tr>
  </table>
  <div id="debugmsg"></div>
  
  <div class="menubar">
    <h2>Actions</h2>
  </div>
  
    <div class="boxred" style="padding:20px;min-width:200" >
      <table>
        <tr>
          <td valign="top">
            Save selected tracks so you can  <input type='button' value='Preview' onclick='UIsave();' />
          </td>
          <td valign="top">
            <span id="midiindiv" ></span>
          </td>
          <td valign="top">
            Select <span id="midioutdiv" ></span> to 
            <input id='playbutton' style='display:inline;' type='button' value='Play' onclick='UIplayit();' />
            <input id='stopbutton' style='display:none;' type='button' value='Stop' onclick='UIstopit();' />

          </td>
          <td valign="top" width="50%">Select tracks and click Preview to generate a new download a new Midi file. If your browser supports it you can select an output 
          method and click Play.</td>
        </tr>
      </table>
  </div>
  <div class="menubar">
    <h2>Generate code</h2>
  </div>
  <div class='box' style="padding:20px;min-width:200" id="outputopts">
  </div>
  <form id="saveform" method="POST" action="1.php"  enctype="multipart/form-data">
    <input type="hidden" name="action" value="play" />
    <input type="hidden" name="data" value="" />
    <input type="hidden" name="name" value="" />
  </form>
  <div class="menubar">
    <a name="sketch"></a>
    <h2>Miditune Sketch</h2>
  </div>

  <div class="box"  style="padding:20px;min-width:200">
    <p>These are the sources of the Arduino sketch that plays the output generated by the convert button. The miditune.ino file is the one you replace with the saved one
    from the web page. To compile it and upload it to the Arduino, you will have to close the miditune sketch in the arduino IDE and re-open it. I have not found a way to
  refresh the source in the Arduino IDE when you change it. Currently the loop() function defined in play.ino, plays the tune once and then will play the tune again when you 
bring the D0 input high. I have a button on D0 which plays the tune when pressed.
</p>
  <dl>
    <dt>miditune</dt>
    <dd>Folder for the sketch. Create a folder called "miditune" and download the following files in it.</dd>
    <dt>
      <a href="miditune/miditune.ino"> miditune.ino</a>
    </dt>
    <dd>This is the sample source data file. The convert output should be saved into this file.</dd>
    <dt>
      <a href="miditune/play.ino"> play.ino</a>
    </dt>
    <dd>play.ino is the main part of the sketch that plays the data in miditune.ino. The setup() and loop() functions are defined here.</dd>
    <dt>
      <a href="miditune/play.h"> play.h</a>
    </dt>
    <dd>play.h has definitions used by play.ino</dd>
    <dt>
      <a href="miditune/miditune.h"> miditune.h</a>
    </dt>
    <dd>miditune.h has definitions used by miditune.ino</dd>
  </dl>
  </div>

  <!-- Bottom of page -->
</td><td valign="top">
&nbsp;<br />
<?php
include "$base/../common/softbits-right.php";
?>

  <iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="//ws-na.amazon-adsystem.com/widgets/q?ServiceVersion=20070822&OneJS=1&Operation=GetAdHtml&MarketPlace=US&source=ac&ref=qf_sp_asin_til&ad_type=product_link&tracking_id=moddersandroc-20&marketplace=amazon&region=US&placement=B00OKB7HU6&asins=B00OKB7HU6&linkId=7KCO3LMK6DEF7E54&show_border=true&link_opens_in_new_window=true">
  </iframe>
</td></tr>
</table>

<div class="menubar">
&nbsp;<br>
&nbsp;
</div>

</body>
