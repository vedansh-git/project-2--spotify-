let currentSong = new Audio();

let songs;        // will be array of FILENAMES (not paths)
let currFolder;   // will be like "songs/english" or "songs/a3"

// Convert seconds -> mm:ss
function secondsToMinutesSeconds(seconds) {
    seconds = Math.floor(seconds);          // remove decimals
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    // pad with leading zeros
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');

    return `${mm}:${ss}`;
}

// ========================
// getSongs(folder)
// NOW uses songs.json instead of 127.0.0.1
// ========================
async function getSongs(folder) {
    currFolder = folder; // e.g. "songs/a3" or "songs/english"

    // CHANGED: load manifest (array of objects) from songs.json
    let res = await fetch("/songs.json");     
    let data = await res.json();                    

    // folder param is like "songs/a3" → we want just "a3"
    const folderName = folder.split("/").filter(Boolean).pop();  

    // filter songs that belong to this folder
    const folderTracks = data.filter(t => t.folder === folderName); 

    // songs[] will be just filenames like "funk-funky song.mp3"
    songs = folderTracks.map(t => t.path.split("/").pop());         

    // shows all songs in the playlist (same as your logic, but uses songs[])
    let songUl = document.querySelector(".songList").getElementsByTagName("ul")[0];
    songUl.innerHTML = "";
    for (const song of songs) {
        songUl.innerHTML = songUl.innerHTML + `<li>
            <img class="invert" src="music.svg" alt="" style="width:24px; height:20px;">
            <div class="info">
                <div>${song.replaceAll("%20", " ")}</div>
            </div>
            <div class="playNow">
                A. R. Rahman
                <img class="invert" src="play.svg" alt="">
            </div>
        </li>`;
    }

    // attach an event listner to each song
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", element => {
            const name = e.querySelector(".info").firstElementChild.innerHTML.trim();
            console.log(name);
            // name is just filename → playMusic uses currFolder + filename
            playMusic(name);
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    // track is filename like "funk-funky song.mp3"
    // currFolder is like "songs/a3"
    // ✅ encodeURIComponent so spaces work on Netlify
    currentSong.src = `/${currFolder}/` + encodeURIComponent(track);   // ✅ CHANGED (added encodeURIComponent)

    if (!pause) {
        currentSong.play();
        play.src = "pause.svg";
    }
    document.querySelector(".songInfo").innerHTML = track;
    document.querySelector(".songTime").innerHTML = "00:00 / 00:00";
};

// ========================
// displayAlbums()
// NOW uses songs.json for folders + info.json for metadata
// ========================
async function displayAlbums() {
    // ✅ CHANGED: read folders from songs.json instead of 127.0.0.1/songs/
    let res = await fetch("/songs.json");          
    let data = await res.json();                   

    let cardContainer = document.querySelector(".cardContainer");
    let output = ""; // buffer for HTML

    // Get unique folder names from manifest, e.g. "a1", "a2", "a3"...
    const folderSet = new Set(data.map(t => t.folder));  

    for (let folderName of folderSet) {                   
        // Try to load info.json for that folder
        let title = folderName;
        let description = "";

        try {
            // e.g. /songs/a3/info.json
            let meta = await fetch(`/songs/${encodeURIComponent(folderName)}/info.json`);
            if (meta.ok) {
                let info = await meta.json();
                if (info.title) title = info.title;
                if (info.description) description = info.description;
            }
        } catch (e) {
            console.log("No info.json for folder", folderName);
        }

        // Build card, data-folder = "songs/a3"
        output += `
        <div data-folder="songs/${folderName}" class="card">   <!-- ✅ CHANGED -->
            <div class="play">
                <svg width="60" height="48" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="#1DB954" />
                    <polygon points="42,30 72,50 42,70" fill="black" />
                </svg>
            </div>
            <img src="/songs/${encodeURIComponent(folderName)}/cover.jpg">
            <h2>${title}</h2>
            <p>${description}</p>
        </div>`;
    }

    cardContainer.innerHTML = output; // replace once

    // Load the playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            console.log("Fetching Songs");
            // data-folder is like "songs/a3" → pass directly to getSongs
            songs = await getSongs(item.currentTarget.dataset.folder);   // ✅ CHANGED
            if (songs.length > 0) {
                playMusic(songs[0]);
            }
        });
    });
}

async function main() {

 
    await getSongs("songs/a3"); 

    displayAlbums();

    // attach an event listener to play , next , prev
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "pause.svg";
        }
        else {
            currentSong.pause();
            play.src = "play.svg";
        }
    });

    // listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        console.log(currentSong.currentTime, currentSong.duration);
        document.querySelector(".songTime").innerHTML =
            `${secondsToMinutesSeconds(currentSong.currentTime)}/${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left =
            (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });

    // ========================
    // Previous button (fixed)
    // ========================
    previous.addEventListener("click", () => {
        currentSong.pause();
        console.log("Previous clicked");

        // get current filename from audio src and decode it
        const curFile = decodeURIComponent((currentSong.src || "").split("/").slice(-1)[0] || "");   

        // find index by comparing filenames (handles encoded/decoded)
        const index = songs.findIndex(s => {
            try {
                return decodeURIComponent(s) === curFile;
            } catch (e) {
                return s === curFile;
            }
        });                                                                                       

        if (index > 0) {
            playMusic(songs[index - 1]);
        }
    });

    // ========================
    // Next button (fixed)
    // ========================
    next.addEventListener("click", () => {
        currentSong.pause();
        console.log("Next clicked");

        const curFile = decodeURIComponent((currentSong.src || "").split("/").slice(-1)[0] || "");  

        const index = songs.findIndex(s => {
            try {
                return decodeURIComponent(s) === curFile;
            } catch (e) {
                return s === curFile;
            }
        });                                                                                       

        if (index >= 0 && (index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // add event to volume
    document.querySelector(".volume-slider").addEventListener("input", (e) => {
        console.log("Setting volume to", e.target.value);
        currentSong.volume = e.target.value;
    });

    // (This block is now redundant with displayAlbums' click handler,
    // but I’m keeping it since you already had it)
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        console.log(e);
        e.addEventListener("click", async item => {
            songs = await getSongs(item.currentTarget.dataset.folder);
        });
    });

    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    });

    // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

}

main();