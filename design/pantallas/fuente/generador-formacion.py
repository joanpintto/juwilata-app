from screens import GLASS, GLASS_G, BG, PILL_ON, LABEL, CREST, MINI, nav, header, segmented, ON_JS, OUT
import json
COACH='/_blob/5ace208c34faabec4498a6f4a38316cd'
PW,PH=358,500
players=[('FERRAN',179,64,'DC',84),('GARCÍA',100,172,'MCO',86),('KAMPI',258,172,'MC',80),('NICO',46,290,'LAT',63),('ÁLEX',179,302,'DFC',72),('PAU',312,290,'LAT',71),('TONI',179,420,'POR',66)]
MINI=dict(MINI); MINI['NICO']='/_blob/110fabd0b536b0396691d6f1037e42ba'
OUTPOS={'ÁLEX':'sec','NICO':'fuera'}
BADGE={'sec':('#f08a24','240,138,36','Posición secundaria'),'fuera':('#e0303f','224,48,63','Fuera de posición')}
bench=[('SERGI','DFC',68,'Disponible',"312'"),('ROCA','DFC',77,'Disponible',"590'"),('DANI','LAT',61,'Baja',"96'"),('MARC','DC',75,'Disponible',"205'")]
CW,CH=62,88
links=[(0,1,12),(0,2,8),(1,2,13),(1,3,3),(2,5,9),(1,4,6),(2,4,8),(3,4,2),(4,5,3),(3,6,2),(4,6,4),(5,6,6)]
QUIMICA=round(sum(1 if n>=10 else (0.5 if n>=5 else 0) for a,b,n in links)/len(links)*100)
def lcol(n): return '#5fd08f' if n>=10 else ('#f0a340' if n>=5 else '#e0495f')

def pitch():
    lines=(f'<svg width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
           f'<defs><filter id="fl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
           f'<filter id="lg" filterUnits="userSpaceOnUse" x="0" y="0" width="{PW}" height="{PH}"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.25  0 0 0 0 0.1  0 0 0 0.9 0"/></filter></defs>'
           f'<rect width="{PW}" height="{PH}" filter="url(#grain)" opacity="0.35"/>'
           f'<g fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.6" filter="url(#fl)">'
           f'<rect x="12" y="12" width="{PW-24}" height="{PH-24}" rx="4"/><line x1="12" y1="{PH/2}" x2="{PW-12}" y2="{PH/2}"/>'
           f'<circle cx="{PW/2}" cy="{PH/2}" r="44"/><circle cx="{PW/2}" cy="{PH/2}" r="2.5" fill="#fff"/>'
           f'<rect x="{PW/2-80}" y="12" width="160" height="64"/><rect x="{PW/2-38}" y="12" width="76" height="24"/><path d="M{PW/2-30},76 A34,34 0 0 0 {PW/2+30},76"/>'
           f'<rect x="{PW/2-80}" y="{PH-76}" width="160" height="64"/><rect x="{PW/2-38}" y="{PH-36}" width="76" height="24"/><path d="M{PW/2-30},{PH-76} A34,34 0 0 1 {PW/2+30},{PH-76}"/>'
           f'<path d="M12,22 A10,10 0 0 0 22,12 M{PW-22},12 A10,10 0 0 0 {PW-12},22 M12,{PH-22} A10,10 0 0 1 22,{PH-12} M{PW-22},{PH-12} A10,10 0 0 1 {PW-12},{PH-22}"/></g>'
           + ''.join(f'<line x1="{players[a][1]}" y1="{players[a][2]+CH/2+4:.0f}" x2="{players[b][1]}" y2="{players[b][2]+CH/2+4:.0f}" stroke="{lcol(n)}" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round" filter="url(#lg)"/>' for a,b,n in links)
           + '</svg>')
    spots=''.join(f'<div class="f-spot" style="position: absolute; left: {x-46}px; top: {y+22}px; width: 92px; height: 34px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,245,215,0.45), rgba(255,245,215,0)); animation-delay: {-i*0.4:.1f}s"></div>' for i,(n,x,y,p,o) in enumerate(players))
    cards=''.join(f'<img src="{MINI[n]}" alt="{n}, {p}, {o}" style="position: absolute; left: {x-CW/2:.0f}px; top: {y-CH/2:.0f}px; width: {CW}px; height: {CH}px; filter: drop-shadow(0 10px 12px rgba(0,0,0,0.55))">' for n,x,y,p,o in players)
    def base(n,x,y,p):
        c,g={'sec':('#ffb44d','240,150,40'),'fuera':('#ff6b76','255,70,90')}.get(OUTPOS.get(n),('#7be8a4','80,220,140'))
        uid=n.encode('ascii','ignore').decode() or 'x'
        return (f'<div aria-label="Posición en el campo: {p}" style="position: absolute; left: {x-22}px; top: {y+CH/2-5:.0f}px; width: 44px; height: 18px">'
                f'<svg width="44" height="18" viewBox="0 0 44 18" style="position: absolute; inset: 0; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.45))" aria-hidden="true">'
                f'<defs><linearGradient id="bo{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a2a3f"/><stop offset="1" stop-color="#5e1628"/></linearGradient>'
                f'<linearGradient id="bf{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e1d30"/><stop offset="1" stop-color="#4c1020"/></linearGradient></defs>'
                f'<path d="M8 1 H36 L43 9 L36 17 H8 L1 9 Z" fill="url(#bo{uid})" fill-opacity="0.95"/>'
                f'<path d="M8 1 H36 L32 6 H12 Z" fill="rgba(255,235,225,0.10)"/>'
                f'<path d="M1 9 L8 1 L12 6 L14 17 H8 Z" fill="rgba(255,255,255,0.03)"/>'
                f'<path d="M36 1 L43 9 L36 17 H30 L32 6 Z" fill="rgba(0,0,0,0.07)"/>'
                f'<path d="M12 6 H32 L30 17 H14 Z" fill="url(#bf{uid})"/>'
                f'<path d="M12.2 6.3 H31.8" stroke="rgba(255,225,215,0.22)" stroke-width="0.6"/></svg>'
                f'<span style="position: absolute; left: 0; right: 0; top: 7.5px; text-align: center; font-family: Barlow Condensed, sans-serif; font-size: 8px; font-weight: 700; line-height: 8px; letter-spacing: 0.3px; color: {c}; text-shadow: 0 0 3px rgba({g},0.65)">{p}</span></div>')
    bases=''.join(base(n,x,y,p) for n,x,y,p,o in players)
    badges=''.join(f'<div title="{BADGE[OUTPOS[n]][2]}" aria-label="{n}: {BADGE[OUTPOS[n]][2].lower()}" style="position: absolute; left: {x+CW/2-13:.0f}px; top: {y-CH/2-5:.0f}px; width: 18px; height: 18px; border-radius: 9px; background: {BADGE[OUTPOS[n]][0]}; border: 1.5px solid #fff3e0; box-shadow: 0 0 10px rgba({BADGE[OUTPOS[n]][1]},0.9); display: flex; align-items: center; justify-content: center; font-family: Barlow Condensed, sans-serif; font-weight: 800; font-size: 13px; color: #fff">!</div>' for n,x,y,p,o in players if n in OUTPOS)
    q=QUIMICA; qc='#5fd08f' if q>=70 else ('#f0a340' if q>=40 else '#e0495f')
    quim=(f'<div style="position: absolute; left: 10px; top: 10px; display: flex; align-items: center; gap: 8px; padding: 6px 10px 6px 6px; border-radius: 16px; background: rgba(0,0,0,0.72); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px)">'
          f'<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="4"/><circle cx="17" cy="17" r="14" fill="none" stroke="{qc}" stroke-width="4" stroke-linecap="round" stroke-dasharray="{q/100*87.96:.1f} 87.96" transform="rotate(-90 17 17)" style="filter: drop-shadow(0 0 3px {qc})"/></svg>'
          f'<div style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #C9BFB6">QUÍMICA</span><span style="font-family: Barlow Condensed, sans-serif; font-size: 20px; font-weight: 800; line-height: 1; color: {qc}">{q}%</span></div></div>')
    coach=(f'<div style="position: absolute; right: 8px; top: 8px; display: flex; flex-direction: column; align-items: center; gap: 3px">'
           f'<img src="{COACH}" alt="Míster, 74" style="width: 54px; height: 77px; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.55))">'
           f'<span style="font-size: 9px; font-weight: 700; letter-spacing: 1px; padding: 2px 6px; border-radius: 6px; background: rgba(0,0,0,0.45); color: #E3C8A3">MÍSTER</span></div>')
    return (f'<div style="position: relative; width: {PW}px; height: {PH}px; border-radius: 22px; overflow: hidden; border: 1px solid rgba(255,255,255,0.18); '
            f'background: radial-gradient(120% 70% at 50% 45%, #3f8f4e 0%, #2b6a37 45%, #173b1f 100%); '
            f'box-shadow: inset 0 0 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2), 0 18px 40px rgba(0,0,0,0.45)">'
            f'<div style="position: absolute; inset: 0; background: repeating-linear-gradient(180deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 50px, rgba(0,0,0,0.06) 50px, rgba(0,0,0,0.06) 100px)"></div>'
            f'<div style="position: absolute; inset: 0; background: radial-gradient(45% 35% at 0% 0%, rgba(255,250,230,0.28), rgba(255,250,230,0) 70%), radial-gradient(45% 35% at 100% 0%, rgba(255,250,230,0.22), rgba(255,250,230,0) 70%), radial-gradient(60% 30% at 50% 100%, rgba(125,26,47,0.35), rgba(125,26,47,0) 70%)"></div>'
            f'<img src="{CREST}" alt="" style="position: absolute; left: {PW/2-40}px; top: {PH/2-62}px; width: 80px; height: 124px; object-fit: contain; opacity: 0.09">'
            f'<div class="f-sweep" style="position: absolute; top: -15%; left: -55%; width: 60%; height: 130%; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,248,220,0.42), rgba(255,248,220,0.12) 55%, rgba(255,248,220,0)); filter: blur(22px); mix-blend-mode: screen"></div>'
            f'{lines}{spots}{bases}{cards}{badges}{coach}{quim}</div>')

def chip(label,val,accent=False):
    c='#CCA37C' if accent else '#F2F0EC'
    return (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 8px 4px; border-radius: 14px; {GLASS}">'
            f'<span style="font-family: \'Barlow Condensed\', sans-serif; font-size: 20px; font-weight: 800; color: {c}; font-variant-numeric: tabular-nums">{val}</span>'
            f'<span style="font-size: 10px; color: #C9BFB6; letter-spacing: 0.6px; text-transform: uppercase">{label}</span></div>')

def formacion():
    bench_minis=''.join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 4px"><img src="{MINI[n]}" alt="{n}" style="width: 56px; height: 80px; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.5)); {"opacity: 0.45" if e=="Baja" else ""}"><span style="font-size: 10px; font-weight: 600; color: {"#f0b2b7" if e=="Baja" else "#C9BFB6"}">{"Baja" if e=="Baja" else p}</span></div>' for n,p,o,e,m in bench)
    tit=f'''<sc-if value="{{{{ isTit }}}}" hint-placeholder-val="{{{{ true }}}}">
<div style="display: flex; flex-direction: column; gap: 14px">
{pitch()}
<div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 12px; border-radius: 14px; {GLASS}; font-size: 11px; color: #C9BFB6">
<span style="font-weight: 600; color: #F2F0EC">Conexión</span>
<span style="display: flex; align-items: center; gap: 5px"><span style="width: 14px; height: 4px; border-radius: 2px; background: #5fd08f; box-shadow: 0 0 6px #5fd08f"></span>10+ partidos</span>
<span style="display: flex; align-items: center; gap: 5px"><span style="width: 14px; height: 4px; border-radius: 2px; background: #f0a340; box-shadow: 0 0 6px #f0a340"></span>5-9</span>
<span style="display: flex; align-items: center; gap: 5px"><span style="width: 14px; height: 4px; border-radius: 2px; background: #e0495f; box-shadow: 0 0 6px #e0495f"></span>0-4</span>
</div>
<div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(145deg, rgba(85,11,28,0.55), rgba(20,4,8,0.82) 55%, rgba(0,0,0,0.92))"><div style="display: flex; align-items: center; gap: 10px"><span style="width: 18px; height: 18px; flex-shrink: 0; border-radius: 9px; background: #f08a24; box-shadow: 0 0 8px rgba(240,138,36,0.8); display: flex; align-items: center; justify-content: center; font-family: Barlow Condensed, sans-serif; font-weight: 800; font-size: 13px; color: #fff">!</span><span style="font-size: 12px; color: #F2E3D2"><b>ÁLEX</b> es MCD y juega de <b>DFC</b>, su posición secundaria</span></div><div style="display: flex; align-items: center; gap: 10px"><span style="width: 18px; height: 18px; flex-shrink: 0; border-radius: 9px; background: #e0303f; box-shadow: 0 0 8px rgba(224,48,63,0.8); display: flex; align-items: center; justify-content: center; font-family: Barlow Condensed, sans-serif; font-weight: 800; font-size: 13px; color: #fff">!</span><span style="font-size: 12px; color: #F2E3D2"><b>NICO</b> es DC y juega de <b>LAT</b>, fuera de sus posiciones</span></div></div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">{chip('Once','74,6',True)}{chip('Defensa','68,7')}{chip('Medio','83,0')}{chip('Ataque','84,0')}</div>
<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 20px; {GLASS}">
<div style="display: flex; justify-content: space-between; align-items: baseline"><div style="{LABEL}">Banquillo</div><div style="font-size: 12px; color: #C9BFB6">Arrastra para cambiar</div></div>
<div style="display: flex; justify-content: space-between">{bench_minis}</div>
</div>
</div>
</sc-if>'''
    rows=''
    for n,p,o,e,m in bench:
        est=('<span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: rgba(200,90,99,0.25); color: #f0b2b7">Baja</span>' if e=='Baja'
             else '<span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: rgba(95,174,134,0.22); color: #b5ecd0">Disponible</span>')
        btn=('' if e=='Baja' else '<button type="button" style="height: 36px; padding: 0 12px; border-radius: 12px; border: 1px solid rgba(204,163,124,0.5); background: rgba(204,163,124,0.12); color: #E3C8A3; font-size: 12px; font-weight: 700">Al campo</button>')
        rows+=(f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 18px; {GLASS}">'
               f'<img src="{MINI[n]}" alt="{n}" style="width: 62px; height: 89px; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.5)); {"opacity: 0.5" if e=="Baja" else ""}">'
               f'<div style="display: flex; flex-direction: column; gap: 5px; flex-grow: 1"><div style="display: flex; align-items: center; gap: 8px"><span style="font-family: \'Barlow Condensed\', sans-serif; font-size: 20px; font-weight: 700">{n}</span>{est}</div>'
               f'<div style="font-size: 12px; color: #C9BFB6">{p} · media {o} · {m} jugados</div></div>{btn}</div>')
    sup=f'''<sc-if value="{{{{ isSup }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 10px">{rows}</div>
</sc-if>'''
    def hbar(lbl,val,maxv=99,minv=55):
        w=(val-minv)/(maxv-minv)*100
        return (f'<div style="display: grid; grid-template-columns: 70px 1fr 44px; align-items: center; gap: 10px; height: 30px"><span style="font-size: 13px; color: #C9BFB6">{lbl}</span>'
                f'<span style="height: 8px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; display: block"><span style="display: block; height: 8px; width: {w:.0f}%; border-radius: 4px; background: linear-gradient(90deg, #a37f5c, #CCA37C, #f3dca4)"></span></span>'
                f'<span style="text-align: right; font-family: \'Barlow Condensed\', sans-serif; font-size: 18px; font-weight: 700">{str(val).replace(".",",")}</span></div>')
    card=lambda t,s,c: (f'<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 20px; {GLASS}"><div style="display: flex; flex-direction: column; gap: 3px">'
                        f'<div style="font-family: \'Barlow Condensed\', sans-serif; font-size: 20px; font-weight: 700; line-height: 1.1">{t}</div><div style="font-size: 12px; color: #A8A29A">{s}</div></div>{c}</div>')
    forma=[('GARCÍA',8.1),('FERRAN',7.9),('KAMPI',7.6),('ÁLEX',6.9),('TONI',7.0),('PAU',6.9),('NICO',6.5)]
    fr=''.join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1"><span style="font-family: \'Barlow Condensed\', sans-serif; font-size: 14px; font-weight: 700">{str(v).replace(".",",")}</span>'
               f'<span style="width: 18px; height: 70px; border-radius: 6px; background: rgba(255,255,255,0.06); display: flex; align-items: flex-end; overflow: hidden"><span style="display: block; width: 18px; height: {(v-6)/2.5*70:.0f}px; border-radius: 6px; background: {"linear-gradient(180deg,#9fdcbc,#5fae86)" if v>=7.5 else "linear-gradient(180deg,#e3c8a3,#a37f5c)"}"></span></span>'
               f'<span style="font-size: 9px; color: #C9BFB6">{n[:4]}</span></div>' for n,v in forma)
    est=f'''<sc-if value="{{{{ isEst }}}}" hint-placeholder-val="{{{{ false }}}}">
<div style="display: flex; flex-direction: column; gap: 14px">
<div style="position: relative; overflow: hidden; display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 22px; {GLASS_G}">
<div style="position: relative; width: 96px; height: 96px; flex-shrink: 0">
<svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8"/><circle cx="48" cy="48" r="40" fill="none" stroke="#CCA37C" stroke-width="8" stroke-linecap="round" stroke-dasharray="{(74.6-60)/39*251.3:.1f} 251.3" transform="rotate(-90 48 48)"/></svg>
<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center"><span style="font-family: 'Barlow Condensed', sans-serif; font-size: 30px; font-weight: 800; line-height: 1">74,6</span><span style="font-size: 10px; color: #E9DCD2">media</span></div>
</div>
<div style="display: flex; flex-direction: column; gap: 4px"><div style="font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 700">Once titular</div><div style="font-size: 12px; color: #E9DCD2; line-height: 1.45">3 Oro · 2 Plata · 2 Bronce<br>−0,7 respecto al once habitual</div></div>
</div>
{card('Química del once · '+str(QUIMICA)+'%','12 conexiones · verde ≈8,3 %, naranja ≈4,2 %, roja 0 %','<div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 2px"><span style="flex: 2; background: #5fd08f"></span><span style="flex: 5; background: #f0a340"></span><span style="flex: 5; background: #e0495f"></span></div><div style="display: flex; justify-content: space-between; font-size: 12px; color: #C9BFB6"><span>2 verdes</span><span>5 naranjas</span><span>5 rojas</span></div><div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px"><div style="display: flex; justify-content: space-between"><span>Más fuerte: <b>GARCÍA – KAMPI</b></span><span style="color: #9fe8bd; font-weight: 700">13</span></div><div style="display: flex; justify-content: space-between"><span>Más débil: <b>NICO – TONI</b></span><span style="color: #f0a0ac; font-weight: 700">2</span></div></div>')}
{card('Media por línea','Titulares de la formación 1-3-2-1', hbar('Portería',66)+hbar('Defensa',68.7)+hbar('Medio',83.0)+hbar('Ataque',84.0))}
{card('Forma del once','Nota media de los últimos 5 partidos','<div style="display: flex; gap: 4px; align-items: flex-end">'+fr+'</div>')}
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">{chip('Goles','35',True)}{chip('Asistencias','28')}{chip('MVPs','11')}</div>
{card('Pierna buena','Reparto en el once','<div style="display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 2px"><span style="flex: 5; background: #CCA37C"></span><span style="flex: 2; background: #b0283c"></span></div><div style="display: flex; justify-content: space-between; font-size: 12px; color: #C9BFB6"><span>5 diestros</span><span>2 zurdos</span></div>')}
</div>
</sc-if>'''
    body=f'''{header('Plantilla',False,'<button type="button" style="height: 36px; padding: 0 12px; border-radius: 18px; '+GLASS+'; font-family: Barlow Condensed, sans-serif; font-size: 16px; font-weight: 700; color: #CCA37C; display: flex; align-items: center; gap: 6px">1-3-2-1<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg></button>')}
<div style="display: flex; align-items: center; gap: 10px; margin-top: -8px; padding: 10px 12px; border-radius: 16px; {GLASS}">
<span style="width: 8px; height: 8px; border-radius: 4px; background: #e0868d; box-shadow: 0 0 10px #e0868d" class="f-dot"></span>
<span style="font-size: 12px; color: #E9DCD2; flex-grow: 1">Próximo: <b style="color: #F2F0EC">vs. Atlètic Sants</b> · Sáb 17:30</span>
<span style="font-size: 12px; color: #CCA37C; font-weight: 600">Convocar</span>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 16px; {GLASS}">
<button type="button" onClick="{{{{ s1.go }}}}" style="{{{{ s1.st }}}}">Titulares</button>
<button type="button" onClick="{{{{ s2.go }}}}" style="{{{{ s2.st }}}}">Suplentes</button>
<button type="button" onClick="{{{{ s3.go }}}}" style="{{{{ s3.st }}}}">Estadísticas</button>
</div>
{tit}
{sup}
{est}
{nav('Plantilla')}'''
    css="""@keyframes fSweep{0%{transform:translateX(0) }100%{transform:translateX(330%)}}
@keyframes fSpot{0%{opacity:.55;transform:scale(.9)}100%{opacity:1;transform:scale(1.08)}}
@keyframes fDot{0%{opacity:.4}100%{opacity:1}}
.f-sweep{animation:fSweep 7s ease-in-out infinite}
.f-spot{animation:fSpot 2.4s ease-in-out infinite alternate}
.f-dot{animation:fDot 1.2s ease-in-out infinite alternate}
@media (prefers-reduced-motion: reduce){.f-sweep,.f-spot,.f-dot{animation:none}}"""
    script=f'''class Component extends DCLogic {{
  constructor(p) {{ super(p); this.state = {{ tab: 'tit' }}; }}
  renderVals() {{ {ON_JS}
    const seg=(val)=>({{go:()=>this.setState({{tab:val}}),st:'height: 36px; border: 0; border-radius: 12px; font-size: 13px; font-weight: 600; '+(this.state.tab===val?ON:'background: transparent; color: #A8A29A')}});
    return {{ s1: seg('tit'), s2: seg('sup'), s3: seg('est'), isTit: this.state.tab==='tit', isSup: this.state.tab==='sup', isEst: this.state.tab==='est' }};
  }}
}}'''
    from screens import page
    html=page('Plantilla · Formación',390,1100,body,script)
    html=html.replace("button{font:inherit;color:inherit;cursor:pointer}","button{font:inherit;color:inherit;cursor:pointer}\n"+css,1)
    return html

open(OUT+'FormacionPro.dc.html','w').write(formacion())
print('ok3')
