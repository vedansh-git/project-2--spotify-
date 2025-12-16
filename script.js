let currentSong = new Audio();

let songs;
let currFolder;

 function secondsToMinutesSeconds(seconds) {
    seconds = Math.floor(seconds);          // remove decimals
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    // pad with leading zeros
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');

    return `${mm}:${ss}`;
}


async function getSongs(folder){
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:5501/${folder}/`)
    let response = await a.text();
    console.log(response);
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a")
    songs = []
    for( let index=0 ; index< as.length; index++){
        const element = as[index];
        if(element.href.endsWith(".mp3")){
            songs.push(element.href.split(`/${folder}/`)[1])
        }
    }
    
    // shows all songs in the playlist
    let songUl = document.querySelector(".songList").getElementsByTagName("ul")[0]
    songUl.innerHTML = ""
    for (const song of songs){
        songUl.innerHTML = songUl.innerHTML + `<li><img class="invert" src="music.svg" alt="" style="width:24px; height:20px;">

                        <div class="info">
                    
                            <div>${song.replaceAll("%20"," ")}</div>
                            
                        </div>
                        <div class="playNow">
                              A. R. Rahman
                            <img class="invert" src="play.svg" alt="">
                        </div> </li>`;
    }
    
    // attach an event listner to each song
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e=>{
        e.addEventListener("click" , element=>{
            console.log(e.querySelector(".info").firstElementChild.innerHTML)
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim())
        })
    })

        return songs
}

const playMusic = (track, pause = false)=>{
    // let audio = new Audio("/songs/" + track)
    currentSong.src = `/${currFolder}/` + track
    if (!pause){
        currentSong.play()
        play.src = "pause.svg"
    }
    document.querySelector(".songInfo").innerHTML = track
    document.querySelector(".songTime").innerHTML = "00:00 / 00:00"
}


async function displayAlbums() {
    let res = await fetch('http://127.0.0.1:5501/songs/');
    let html = await res.text();

    let div = document.createElement("div");
    div.innerHTML = html;

    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");

    let output = ""; // buffer for HTML

    for (let e of anchors) {
        if (!e.href.includes("/songs/")) continue;

        let folder = e.href.split("/").filter(Boolean).pop();

        // Fetch metadata
        let meta = await fetch(`http://127.0.0.1:5501/songs/${folder}/info.json`);
        let info = await meta.json();

        output += `
        <div data-folder="${folder}" class="card">
            <div class="play">
                <svg width="60" height="48" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="#1DB954" />
                    <polygon points="42,30 72,50 42,70" fill="black" />
                </svg>
            </div>
            <img src="/songs/${folder}/cover.jpg">
            <h2>${info.title}</h2>
            <p>${info.description}</p>
        </div>`;
    }

    cardContainer.innerHTML = output; // replace once

     // Load the playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => { 
        e.addEventListener("click", async item => {
            console.log("Fetching Songs")
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`)  
            playMusic(songs[0]) 
            
        })
    })


}


async function main() {   

    // get the list of all the song s
    await getSongs("songs/english");
    
    displayAlbums()

    // attach an event listener to play , next , prev
    play.addEventListener("click", ()=>{
        if(currentSong.paused){
            currentSong.play()
            play.src = "pause.svg"
        }
        else{
            currentSong.pause()
            play.src = "play.svg"
        }
    })

    // listen for timeupdate event
    currentSong.addEventListener("timeupdate", ()=>{
        console.log(currentSong.currentTime, currentSong.duration);
        document.querySelector(".songTime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)}/${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%"
    })

    // add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e=>{
    let percent = (e.offsetX/e.target.getBoundingClientRect().width) * 100;
    document.querySelector(".circle").style.left = percent + "%";
            currentSong.currentTime = ((currentSong.duration) * percent) / 100
    })

    // Add an event listener to previous
    previous.addEventListener("click", () => {
        currentSong.pause()
        console.log("Previous clicked")
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1])

        }
    })


    // Add an event listener to next
    next.addEventListener("click", () => {
        currentSong.pause()
        console.log("Next clicked")

        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1])
        }
    })
    // add event to volume
   document.querySelector(".volume-slider").addEventListener("input", (e) => {
    console.log("Setting volume to", e.target.value);
    currentSong.volume = e.target.value;
});

        // if (currentSong.volume >0){
        //     document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg")
        // }
    
       Array.from(document.getElementsByClassName("card")).forEach(e=>{
            console.log(e)
            e.addEventListener("click", async item=>{
                songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
                
            })
        })

        
    // Add event listener to mute the track
          document.querySelector(".volume>img").addEventListener("click", e=>{ 
        if(e.target.src.includes("volume.svg")){
            e.target.src = e.target.src.replace("volume.svg", "mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else{
            e.target.src = e.target.src.replace("mute.svg", "volume.svg")
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    })

     // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

}

main();