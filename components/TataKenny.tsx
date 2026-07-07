/**
 * Tata Kenny — mascotte / logo officiel (DA). Voyante bienveillante :
 * lunettes rondes vertes, foulard doré, boucle créole or, sourire connaisseur.
 * `size` = diamètre en px. `halo` affiche le cercle doré autour.
 */
export function TataKenny({ size = 40, halo = true }: { size?: number; halo?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Tata Kenny">
      {halo && (
        <circle cx="50" cy="50" r="48" fill="rgba(245,200,66,0.12)" stroke="rgba(245,200,66,0.3)" strokeWidth="1.5" />
      )}
      <path d="M18 100 Q20 76 32 68 Q38 64 50 63 Q63 63 70 68 Q82 76 84 100Z" fill="#1E5C3E" />
      <path d="M42 68 Q50 76 58 68" fill="none" stroke="#F4EEE3" strokeWidth="2" />
      <rect x="43" y="56" width="16" height="14" rx="6" fill="#E8C890" />
      <ellipse cx="50" cy="42" rx="24" ry="26" fill="#E8C890" />
      <ellipse cx="62" cy="48" rx="8" ry="6" fill="#F0B080" opacity="0.3" />
      <ellipse cx="48" cy="20" rx="23" ry="14" fill="#B8B4A8" />
      <ellipse cx="28" cy="34" rx="10" ry="14" fill="#B8B4A8" />
      <ellipse cx="70" cy="30" rx="10" ry="12" fill="#B8B4A8" />
      <ellipse cx="29" cy="32" rx="9" ry="8" fill="#A8A49A" />
      <path d="M26 24 Q50 14 74 24 Q76 32 73 36 Q50 25 27 34Z" fill="#F5C842" />
      <path d="M26 24 Q23 32 27 34 Q26 30 28 26Z" fill="#DEB020" />
      <ellipse cx="26" cy="30" rx="5" ry="4" fill="#DEB020" />
      <circle cx="42" cy="43" r="9" fill="rgba(255,255,255,0.08)" stroke="#143728" strokeWidth="2.5" />
      <circle cx="60" cy="41" r="8.5" fill="rgba(255,255,255,0.08)" stroke="#143728" strokeWidth="2.5" />
      <path d="M51 43 Q55 40 51 40" stroke="#143728" strokeWidth="2" fill="none" />
      <line x1="68.5" y1="41" x2="74" y2="38" stroke="#143728" strokeWidth="2.2" />
      <ellipse cx="42" cy="43" rx="4" ry="3.5" fill="#2A1A0A" />
      <ellipse cx="60" cy="41" rx="3.8" ry="3.2" fill="#2A1A0A" />
      <ellipse cx="40" cy="41" rx="1.5" ry="1.2" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="58" cy="39" rx="1.5" ry="1.2" fill="rgba(255,255,255,0.5)" />
      <path d="M50 51 Q47 56 48 59 Q51 61 54 59" stroke="#C08050" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M40 66 Q50 73 62 66" stroke="#B05050" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M33 35 Q42 30 51 33" stroke="#7A6A50" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M51 31 Q60 27 69 30" stroke="#7A6A50" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="74" cy="44" rx="5" ry="7" fill="#E0B880" />
      <circle cx="74" cy="51" r="3" fill="none" stroke="#F5C842" strokeWidth="2" />
    </svg>
  );
}

/** Grande Tata Kenny pour le hero (buste 3/4, doigt pointé, tasse de thé). */
export function TataKennyHero({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 500" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Tata Kenny">
      <path d="M80 360 Q55 380 48 420 Q52 430 66 426 Q72 385 100 365Z" fill="#E8C890" />
      <rect x="28" y="415" width="48" height="36" rx="7" fill="#F9F6F0" stroke="#DDD8CE" strokeWidth="1.5" />
      <path d="M76 421 Q90 421 90 433 Q90 445 76 445" fill="none" stroke="#DDD8CE" strokeWidth="3" />
      <rect x="32" y="419" width="40" height="28" rx="4" fill="#C8A030" opacity="0.55" />
      <path d="M40 413 Q43 405 40 397" stroke="rgba(244,238,227,0.25)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M52 411 Q55 403 52 395" stroke="rgba(244,238,227,0.25)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M64 413 Q67 405 64 397" stroke="rgba(244,238,227,0.25)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M50 500 Q54 390 100 358 Q128 342 170 340 Q214 340 244 358 Q292 388 296 500Z" fill="#1E5C3E" />
      <path d="M130 358 Q150 380 170 358" fill="none" stroke="rgba(244,238,227,0.4)" strokeWidth="2.5" />
      <rect x="200" y="390" width="42" height="28" rx="3" fill="none" stroke="rgba(244,238,227,0.2)" strokeWidth="1.5" />
      <path d="M210 392 Q221 385 232 392" fill="none" stroke="#F5C842" strokeWidth="2" />
      <circle cx="170" cy="385" r="4" fill="rgba(244,238,227,0.15)" stroke="rgba(244,238,227,0.3)" strokeWidth="1" />
      <circle cx="170" cy="410" r="4" fill="rgba(244,238,227,0.15)" stroke="rgba(244,238,227,0.3)" strokeWidth="1" />
      <path d="M264 355 Q295 368 318 338 Q308 320 294 326 Q282 350 260 352Z" fill="#E8C890" />
      <rect x="290" y="318" width="26" height="18" rx="3" fill="#F4EEE3" stroke="rgba(30,92,62,0.3)" strokeWidth="1" />
      <path d="M310 318 Q315 285 312 255 Q318 252 324 255 Q328 285 323 318Z" fill="#E8C890" />
      <ellipse cx="318" cy="255" rx="5" ry="4" fill="#F8C8C8" stroke="#E0A0A0" strokeWidth="0.8" />
      <rect x="152" y="325" width="38" height="22" rx="10" fill="#E8C890" />
      <ellipse cx="170" cy="228" rx="78" ry="86" fill="#EAC888" />
      <ellipse cx="240" cy="230" rx="14" ry="20" fill="#D8A860" opacity="0.3" />
      <ellipse cx="208" cy="258" rx="20" ry="14" fill="#F0A870" opacity="0.25" />
      <ellipse cx="134" cy="255" rx="16" ry="12" fill="#F0A870" opacity="0.2" />
      <ellipse cx="168" cy="158" rx="76" ry="48" fill="#BCBAB0" />
      <ellipse cx="98" cy="200" rx="30" ry="42" fill="#BCBAB0" />
      <ellipse cx="238" cy="190" rx="25" ry="34" fill="#BCBAB0" />
      <ellipse cx="166" cy="148" rx="62" ry="36" fill="#CCCAC0" />
      <ellipse cx="97" cy="195" rx="26" ry="22" fill="#AEACA2" />
      <circle cx="84" cy="188" r="3" fill="#F5C842" />
      <path d="M95 160 Q168 138 242 158 Q248 172 244 180 Q170 158 96 176Z" fill="#F5C842" />
      <ellipse cx="96" cy="168" rx="8" ry="6" fill="#DEB020" />
      <circle cx="148" cy="230" r="27" fill="rgba(240,248,255,0.12)" stroke="#143728" strokeWidth="3.5" />
      <circle cx="200" cy="225" r="25" fill="rgba(240,248,255,0.12)" stroke="#143728" strokeWidth="3.5" />
      <path d="M175 230 Q188 224 175 224" stroke="#143728" strokeWidth="3" fill="none" />
      <line x1="121" y1="229" x2="106" y2="222" stroke="#143728" strokeWidth="3" />
      <line x1="225" y1="224" x2="241" y2="218" stroke="#143728" strokeWidth="3" />
      <ellipse cx="148" cy="230" rx="13" ry="11" fill="#2A1A0A" />
      <ellipse cx="200" cy="225" rx="12" ry="10" fill="#2A1A0A" />
      <ellipse cx="149" cy="230" rx="4" ry="4" fill="#0A0A0A" />
      <ellipse cx="201" cy="225" rx="3.8" ry="3.8" fill="#0A0A0A" />
      <ellipse cx="142" cy="224" rx="5" ry="3.5" fill="rgba(255,255,255,0.4)" />
      <ellipse cx="194" cy="219" rx="4.5" ry="3" fill="rgba(255,255,255,0.4)" />
      <path d="M122 208 Q145 198 168 204" stroke="#7A6A50" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M176 202 Q198 192 222 198" stroke="#7A6A50" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M164 250 Q156 264 160 272 Q167 277 174 272" stroke="#C08850" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M144 292 Q168 308 194 294" stroke="#A84040" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M148 292 Q168 286 192 292" stroke="#C07060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="248" cy="232" rx="14" ry="20" fill="#DCAA70" />
      <circle cx="248" cy="250" r="8" fill="none" stroke="#F5C842" strokeWidth="3" />
      <circle cx="248" cy="258" r="3.5" fill="#F5C842" />
    </svg>
  );
}

/** Mot-logo KENNYGAMES (GAMES en or). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold uppercase tracking-[0.1em] ${className}`}>
      Kenny<span className="text-or">Games</span>
    </span>
  );
}
