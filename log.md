### 2024-01-12 10:54:22
wow, what a mess ... 
im not able to fix it in any meaningul way now
but i can just check couple of things :
- [x] resolution : is set to 480x360 ... 
    - i cant really adjust it now without restarting the server
- [ ] room size limit and logic for handling when exceeded
- [ ] are weird unicode chars allowed in room name ? 
    - i might need to use invisible chars in inc roomnate to secure against randos entering (that way they wont be able to get the actual room name by looking at it on the screen)


<!-- but also, i thought i had a log file, i'm pretty sure i did. where is it ???  -->
<!-- the dir structure here is madness -->

and i think, to keep it lightweight, fuck react, we just do it with htmlx

# Mapping the mess

front
 - interface <- htmx 
 - p2p logic 
 - room creation 
 - stream handling
  - splitting tracks 
  - rendering 
    - canvas logic
    - workers
    - shader
 + admin panel (interface, live updates etc.)


back 
 - serving frontend 
    + incl admin panel
 - signalling server 
    <!-- ⬆ separation of business! ⬆ -->
 - room management
 

# Dilemmas 

### htmx or react ? 

what are the **states** i need to track ? 

is in room ? 
    <!-- ⬆ what does it mean exactly ? -->

is connected to [...peers] ?
is connection lost with [...peers?] ?
is trying to reconnect with [...peers?] ?
is connection closed with [...peers?] ?

is sending originalStream from next peer ?
is receiving flippedStream from next peer ?
is receiving originalStream from prev peer ?
is sending flippedStream to prev peer ?
is sending compositeStream to [...peers] ?
is receiving compositeStream from [...peers] ?

is sharing screen ?
is volume on ?

BUT ALSO - what is more extensible ? Ie adding new stuff like special modals for events ? hmmm.... Or the admin panel ?

### any way to make more efficient ?
i am sending 
2 full color value streams ( 1 originalStream + 1 flippedStream )
(peers.length - 1) compositeStreams

eg. in 6 ppl room
i send and receive 7 streams... 

So,
i always send and receive **2 more streams than in a regular p2p situation**
❗BUT ❗ the (peers.length - 1) streams are lighters ! because they are composite streams
    ❓ALTHOUGH ❓ are they really lighter ? it's not black and white ; it still detects edges ...
if (❓is True)
mumler MAY be more efficient than regular p2p video-conf. whith 4+ people in room

| ppl | mumler: full color streams | mumler: composite streams | | p2p: full color streams |
| 3   | 2                          | 2                         | | 2                       |
| 4   | **2**                      | 3                         | | **3**                   |

**Bottom line** : it always sends only 2 full color streams. 
SO *IF* compositeStreams > are more efficient than > regular streams 
*THEN* in larger meetings (4+) mumler is more efficient than regular p2p

TODO: check if compositeStream is more efficient than regular stream
    // in terms of bandwidth, in terms of computation webgl is def. less efficient than video...

💡❓- slimmer mode ? 
something that sacrifices color and texture FOR less bandwidth use ...



# Improvements 

- [ ] admin panel to monitor connections
- manual adjustments per room - (something like console in videogames but pass protected)
- adjustables 
 - max resolution 
 - room size 
 - throttiling ? (i'm not sure i can do it ?} 

# 2024-09-27 18:04:30 : restoring server after digitalocean f-up

need to redirect from www. - still needs to be handled (waiting for dns propagation to check if cname record is enough)

the coturn seems to be configured correctly, now still need to run tests across couple of networks to make sure that turn is relaying (cause now it might just work via STUN)


## switch to client-side rendering 
now its rendered on the server with pug,
which doesnt make much sense,
i should use svelte and render it on the client. (serve compiled svelte js files)

## disable un/disfunctinal ui 
share screen, logs

## add some monitoring tool both on client and on server
on client to check how many tracks are transmitted (audio and video). And between whom, some mesh diagram or something. Socket connections and their status. 

on server - the room+member list (manual rm room option ?)

## things i should move to .env
- the names and passwords of STUN/TURN (cause they are shared coturn (CLI), turnadmin (CLI), and config passed to SimpleSignalClient)
- all the ports
- whether we run locally or remotely (this not necessarily in .env but passed as env var in command)

## ❗what's happening doubled audio track ? when mobile connects, an audio track from another peer gets doubled and played back to him, it seems 
(its not regular feedback, cause when Gustar connected, only Vincent heard his sound doubled, i didn't)

## ❗video stretched on mobile 
i should add an option for clients to choose whether they want their vids to be stretched or no
or an option to stretch all vids, available only from console (expose function)

## the blending shader seems 'uneven'
i felt like some streams were more 'pronounced' than others, but not sure, it looked more or less good with offfence.
it might also be dependent on webcams ppl use... 
and also vid compression that webrtc chooses... based on bandwidth

## 



