const chapterElement=document.getElementById('current-chapter');
const iframe=document.getElementById('pdf-frame');
const loadingOverlay=document.getElementById('loading-overlay');
const ytBtn=document.getElementById('yt-trigger-btn');
const ytModal=document.getElementById('yt-modal');
const toast=document.getElementById('status-toast');
let studySeconds=0;
const motivationEl=document.getElementById('motivation-text');
document.addEventListener("DOMContentLoaded",()=>{
loadSelectedPDF();
checkYTLinkState();
initCanvasParticles();
initTrackingEyes();
});
function loadSelectedPDF(){
const fileId=chapterElement.getAttribute('data-drive-id');
loadingOverlay.style.visibility='visible';
loadingOverlay.style.opacity='1';
iframe.src=`https://drive.google.com/file/d/${fileId}/preview`;
}
function hideLoader(){
loadingOverlay.style.opacity='0';
setTimeout(()=>{loadingOverlay.style.visibility='hidden';},500);
}
function downloadPDF(){
const fileId=chapterElement.getAttribute('data-drive-id');
window.open(`https://drive.google.com/uc?export=download&id=${fileId}`,'_blank');
}
function toggleFullScreen(){
if(!document.fullscreenElement){
document.documentElement.requestFullscreen().catch(err=>console.error(`Error: ${err.message}`));
}else{
document.exitFullscreen();
}
}
function checkYTLinkState(){
const ytLink=chapterElement.getAttribute('data-yt-link').trim();
if(!ytLink||ytLink==='#')ytBtn.classList.add('mild');
}
function handleYTClick(){
const ytLink=chapterElement.getAttribute('data-yt-link').trim();
if(ytLink&&ytLink!=='#'){
ytModal.classList.add('active');
}else{
showToast();
}
}
function closeYTModal(){ytModal.classList.remove('active');}
function proceedToYT(){
const ytLink=chapterElement.getAttribute('data-yt-link').trim();
window.open(ytLink,'_blank');
closeYTModal();
}
function showToast(){
toast.classList.add('show');
setTimeout(()=>{toast.classList.remove('show');},3500);
}
function updateTimer(){
studySeconds++;
const hrs=Math.floor(studySeconds/3600).toString().padStart(2,'0');
const mins=Math.floor((studySeconds%3600)/60).toString().padStart(2,'0');
const secs=(studySeconds%60).toString().padStart(2,'0');
const timeString=`${hrs}:${mins}:${secs}`;
const timerElement=document.getElementById('study-timer');
if(timerElement){
timerElement.textContent=timeString;
}
if(motivationEl){
if(studySeconds===60)motivationEl.textContent="Warming up! 🔥";
else if(studySeconds===300)motivationEl.textContent="Great focus! 🧠";
else if(studySeconds===600)motivationEl.textContent="10 minutes in! ⭐";
else if(studySeconds===1200)motivationEl.textContent="20 mins! Keep going! 💪";
else if(studySeconds===1800)motivationEl.textContent="Half an hour! You're crushing it! ⚡";
else if(studySeconds===2700)motivationEl.textContent="45 mins! Almost an hour! 🎯";
else if(studySeconds===3600)motivationEl.textContent="1 Hour! Remember to stretch! 🧘‍♂️";
}
}
setInterval(updateTimer,1000);
function initTrackingEyes(){
document.querySelectorAll('.tracking-eyes-container').forEach(container=>{
const eyes=container.querySelectorAll('.eye-ball');
const pupils=container.querySelectorAll('.pupil');
document.addEventListener('mousemove',(e)=>{
eyes.forEach((eye,index)=>{
const pupil=pupils[index];
if(!pupil)return;
const rect=eye.getBoundingClientRect();
const cx=rect.left+rect.width/2;
const cy=rect.top+rect.height/2;
const dx=e.clientX-cx;
const dy=e.clientY-cy;
const angle=Math.atan2(dy,dx);
const maxRadius=(rect.width/2)-(pupil.offsetWidth/2)-1.5;
const distance=Math.min(Math.hypot(dx,dy)/10,maxRadius);
pupil.style.transform=`translate(calc(-50% + ${Math.cos(angle)*distance}px), calc(-50% + ${Math.sin(angle)*distance}px))`;
});
});
const blink=()=>{
eyes.forEach(eye=>{
eye.style.transform='scaleY(0.06)';
setTimeout(()=>{eye.style.transform='scaleY(1)';},110);
});
};
const scheduleBlink=()=>{
setTimeout(()=>{blink();scheduleBlink();},3000+Math.random()*4000);
};
scheduleBlink();
});
}
function initCanvasParticles(){
const canvas=document.getElementById('ambient-canvas');
if(!canvas)return;
const ctx=canvas.getContext('2d');
let width,height,particles=[];
function resize(){
width=canvas.width=window.innerWidth;
height=canvas.height=window.innerHeight;
}
window.addEventListener('resize',resize);
resize();
for(let i=0;i<25;i++){
particles.push({
x:Math.random()*width,
y:Math.random()*height,
vx:(Math.random()-0.5)*0.4,
vy:(Math.random()-0.5)*0.4,
r:Math.random()*1.5+0.5
});
}
function draw(){
ctx.clearRect(0,0,width,height);
ctx.fillStyle='rgba(255,255,255,0.4)';
particles.forEach(p=>{
p.x+=p.vx;p.y+=p.vy;
if(p.x<0)p.x=width;
if(p.x>width)p.x=0;
if(p.y<0)p.y=height;
if(p.y>height)p.y=0;
ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
});
requestAnimationFrame(draw);
}
draw();
}