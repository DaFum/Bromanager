const $ = (id) => document.getElementById(id);

const STATIC_PROMPTS = {
  global: 'clear visual style, bright balanced lighting, vivid full-color photorealistic rendering, adult-only venue operations, high detail, clean composition',
  employee: 'medium shot portrait + workplace background, expressive face, practical uniforms, role-authentic tools, story-rich environment, soft film grain',
  applicant: 'interview desk composition, dossier props, neutral posture, professional mood, realistic skin tones and shadows',
  security: 'CCTV aesthetic, timestamp overlay style, wide-angle distortion, surveillance framing, low-fps still-frame vibe',
  summary: 'manager office with organized paperwork and monitor wall, clear daylight-balanced light, photorealistic color grading',
};

const state = {
  day: 1,
  cash: 18000,
  reputation: 58,
  streamTimer: null,
  streamFrame: 0,
  employees: [
    {
      name: 'Mila',
      role: 'Operations Supervisor',
      morale: 74,
      trust: 61,
      stress: 33,
      description: 'Calm, observant operations supervisor with strong conflict de-escalation instincts and excellent guest flow orchestration.',
      memories: ['Took charge during a peak-hour staffing shortage and stabilized service in 12 minutes.'],
    },
    {
      name: 'Jordan',
      role: 'Hospitality Mixologist',
      morale: 69,
      trust: 53,
      stress: 40,
      description: 'Fast and precise hospitality mixologist known for service consistency, inventory discipline, and guest communication.',
      memories: ['Volunteered to train a new barback and improved prep speed for the team.'],
    },
    {
      name: 'Rin',
      role: 'Security Lead',
      morale: 72,
      trust: 57,
      stress: 36,
      description: 'Security lead with sharp situational awareness, calm communication, and policy-first escalation habits.',
      memories: ['Handled an entrance line dispute professionally without operational slowdown.'],
    },
    {
      name: 'Kai',
      role: 'Client Relations Concierge',
      morale: 76,
      trust: 59,
      stress: 34,
      description: 'Client-relations concierge with excellent recall of regular guests and highly organized booking notes.',
      memories: ['Recovered a double-booking error by reassigning rooms without guest complaints.'],
    },
    {
      name: 'Selene',
      role: 'Private Suite Steward',
      morale: 71,
      trust: 56,
      stress: 37,
      description: 'Private-suite steward focused on room turnover quality, guest comfort standards, and discreet service logistics.',
      memories: ['Prepared all premium suites ahead of schedule during a high-demand evening.'],
    },
    {
      name: 'Omar',
      role: 'Housekeeping & Hygiene Lead',
      morale: 73,
      trust: 58,
      stress: 31,
      description: 'Hygiene lead ensuring sanitation, laundry flow, and compliance checklists across all guest and staff areas.',
      memories: ['Introduced a revised sanitation checklist that reduced reset times between bookings.'],
    },
  ],
  cams: [
    {
      id: 'entrance',
      location: 'Entrance',
      status: 'steady arrivals and ID checks',
      staticPrompt: 'venue entrance line, velvet rope control, bouncer checkpoint, evening city reflections on wet pavement',
    },
    {
      id: 'main_hall',
      location: 'Main Hall',
      status: 'active service and shifting guest groups',
      staticPrompt: 'main hospitality hall, table service routes, ambient red-blue practicals, busy but controlled circulation',
    },
    {
      id: 'private_corridor',
      location: 'Private Corridor',
      status: 'controlled access and low traffic',
      staticPrompt: 'private corridor with access doors, low-key lighting, carpet texture, quiet monitored zone',
    },
    {
      id: 'back_office',
      location: 'Back Office',
      status: 'inventory and staffing review',
      staticPrompt: 'back-office desk with logs and monitor wall, coffee cups, scheduling boards, utilitarian fluorescent lighting',
    },
  ],
  config: {
    // Use sessionStorage for the API key (less persistent than localStorage).
    apiKey: sessionStorage.getItem('pollinations_api_key') || '',
    // keep model prefs in localStorage
    textModel: localStorage.getItem('pollinations_text_model') || 'openai-large',
    imageModel: localStorage.getItem('pollinations_image_model') || 'flux',
  },
};

function render() {
  $('statsLine').textContent = `Day ${state.day} · Cash $${state.cash} · Reputation ${state.reputation}`;
  $('teamList').innerHTML = state.employees
    .map(
      (e) => `<div class="emp">
        <strong>${e.name}</strong> (${e.role}) · morale ${e.morale}, trust ${e.trust}, stress ${e.stress}
        <div class="muted">${e.description}</div>
      </div>`
    )
    .join('');
  // if apiKey input exists, set as password input and populate current key (masked by browser)
  const apiInput = $('apiKey');
  if (apiInput) {
    try {
      apiInput.type = 'password';
    } catch (e) {
      // ignore if input type cannot be changed
    }
    apiInput.value = state.config.apiKey || '';
  }
  const textInput = $('textModel');
  if (textInput) textInput.value = state.config.textModel;
  const imageInput = $('imageModel');
  if (imageInput) imageInput.value = state.config.imageModel;
}

function saveConfig() {
  // Read values from inputs and persist models to localStorage; API key stored to sessionStorage only.
  const keyInput = $('apiKey');
  state.config.apiKey = keyInput ? keyInput.value.trim() : '';
  state.config.textModel = $('textModel').value.trim() || 'openai-large';
  state.config.imageModel = $('imageModel').value.trim() || 'flux';

  if (state.config.apiKey) {
    sessionStorage.setItem('pollinations_api_key', state.config.apiKey);
  } else {
    sessionStorage.removeItem('pollinations_api_key');
  }
  localStorage.setItem('pollinations_text_model', state.config.textModel);
  localStorage.setItem('pollinations_image_model', state.config.imageModel);

  $('configStatus').textContent = 'Configuration saved.';
  setTimeout(() => ($('configStatus').textContent = ''), 1800);
}

function stateSummary() {
  return `day=${state.day}, cash=${state.cash}, reputation=${state.reputation}, team=${state.employees
    .map((e) => `${e.name}:${e.role}(m=${e.morale},t=${e.trust},s=${e.stress},memories=${e.memories.length})`)
    .join(';')}`;
}

function setContextHtml(html) {
  $('contextPanel').innerHTML = html;
}

function appendMemory(employee, memory) {
  employee.memories.push(`Day ${state.day}: ${memory}`);
  if (employee.memories.length > 8) employee.memories = employee.memories.slice(-8);
}

function randomApplicant() {
  const templates = [
    {
      name: 'Avery',
      role: 'Guest Experience Host',
      description: 'Confident greeter with queue management experience and excellent composure under pressure.',
      staticPrompt: 'candidate portrait in reception area, clipboard, welcoming posture, practical ambient lighting',
    },
    {
      name: 'Noor',
      role: 'Client Relations Concierge',
      description: 'Detail-oriented concierge candidate focused on scheduling precision and guest preference tracking.',
      staticPrompt: 'concierge interview setup, desk lamp, tablet schedule interface, polished photorealistic color rendering',
    },
    {
      name: 'Casey',
      role: 'Security Lead',
      description: 'Policy-driven security candidate with incident logging discipline and communication-first style.',
      staticPrompt: 'security candidate interview, uniform concept, risk assessment clipboard, neutral office lighting',
    },
    {
      name: 'Sami',
      role: 'Hospitality Mixologist',
      description: 'High-throughput bartender profile with attention to hygiene and inventory control.',
      staticPrompt: 'bartender candidate at service counter, bottles and tools arranged, controlled photorealistic depth of field',
    },
    {
      name: 'Rhea',
      role: 'Private Suite Steward',
      description: 'Suite-service candidate trained in room preparation, guest amenity standards, and discreet operational etiquette.',
      staticPrompt: 'suite attendant interview context, linen carts, amenity checklist, polished photorealistic color rendering',
    },
    {
      name: 'Diego',
      role: 'Housekeeping & Hygiene Lead',
      description: 'Facility-care candidate experienced in sanitation protocols, laundry workflows, and quality audits.',
      staticPrompt: 'operations hygiene interview, checklist clipboard, utility corridor context, clear photorealistic detail',
    },
  ];
  const base = templates[Math.floor(Math.random() * templates.length)];
  return {
    ...base,
    communication: 45 + Math.floor(Math.random() * 51),
    reliability: 45 + Math.floor(Math.random() * 51),
    teamwork: 45 + Math.floor(Math.random() * 51),
  };
}

function buildImageUrl(prompt, seed = '-1') {
  const encodedPrompt = encodeURIComponent(prompt);
  const q = new URLSearchParams({
    model: state.config.imageModel,
    width: '1024',
    height: '1024',
    seed,
    safe: 'false',
    enhance: 'true',
  });
  return `https://gen.pollinations.ai/image/${encodedPrompt}?${q.toString()}`;
}

function composeStaticPrompt(sceneType, extra = '') {
  const map = {
    'Employee Conversation': STATIC_PROMPTS.employee,
    'Applicant Assessment': STATIC_PROMPTS.applicant,
    'Security Monitoring': STATIC_PROMPTS.security,
    'Security Camera Stream': STATIC_PROMPTS.security,
    'End of Day Summary': STATIC_PROMPTS.summary,
  };
  return `${STATIC_PROMPTS.global}; ${map[sceneType] || ''}; ${extra}`.trim();
}

async function generateScene(sceneName, actionSummary, options = {}) {
  const staticPromptPack = composeStaticPrompt(sceneName, options.staticPrompt || '');
  const memoryContext = options.memoryContext || 'No memory context provided.';

  const systemPrompt = `You are a simulation narrator and visual prompt engineer for a role-driven management sim.
Respond ONLY with valid JSON using this exact schema:
{"scene_text":"string","image_prompt":"string"}
Requirements:
- scene_text: 2-5 sentences grounded in current simulation state.
- scene_text: 2-5 sentences grounded in current simulation state and written as strict in-world roleplay narration.
- image_prompt: include BOTH dynamic event details and provided static visual directives, in a clear colorful photorealistic style.
- Force role-accurate depiction: uniforms, posture, tasks, tools, and environment must match the worker role and scene type.
- Keep output professional and grounded.
- Integrate memory context when available and mention continuity in scene_text.
- Scene fidelity rules: camera angle, lighting conditions, color harmony, and composition must match the exact action.
- No markdown, no extra keys.`;

  const userPrompt = `Generate the next scene for a brothel manager simulation.
Scene Type: ${sceneName}
Current State: ${stateSummary()}
Player Action: ${actionSummary}
Memory Context: ${memoryContext}
Static Prompt Directives: ${staticPromptPack}
Role Context: ${options.roleContext || 'No role context provided.'}
Ensure image_prompt is directly usable for image generation and perfectly aligned with scene intent.`;

  let sceneText = '';
  let imagePrompt = '';
  let modelUsed = state.config.textModel;

  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    // Apply Pollinations Bearer token if provided (as confirmed in docs)
    if (state.config.apiKey) headers.Authorization = `Bearer ${state.config.apiKey}`;

    const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: state.config.textModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    modelUsed = data.model || state.config.textModel;
    const raw = data?.choices?.[0]?.message?.content;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    sceneText = parsed.scene_text;
    imagePrompt = parsed.image_prompt;
    if (!sceneText || !imagePrompt) throw new Error('Missing scene fields');
  } catch (err) {
    modelUsed = `fallback-local (${err.message})`;
    sceneText = `Fallback scene (${sceneName}): ${actionSummary}. Team members react based on remembered events and current operational pressure.`;
    imagePrompt = `${staticPromptPack}; dynamic event: ${actionSummary}; memory signals: ${memoryContext}; vivid colors, clear photorealistic lighting, manager POV`;
  }

  const imageUrl = buildImageUrl(imagePrompt, options.seed || '-1');
  $('sceneModel').textContent = modelUsed;
  $('sceneText').textContent = sceneText;
  $('scenePrompt').textContent = imagePrompt;
  $('sceneUrl').href = imageUrl;
  $('sceneUrl').textContent = imageUrl;
  $('sceneImage').src = imageUrl;
}

function renderMemoryList(employee) {
  return employee.memories.map((m) => `<li>${m}</li>`).join('');
}

function askEmployeeContext() {
  setContextHtml(`<h2>Conversation Setup</h2>
    <label for="empSelect">Employee</label>
    <select id="empSelect">${state.employees
      .map((e, i) => `<option value="${i}">${e.name} (${e.role})</option>`)
      .join('')}</select>
    <div id="empCard" class="card"></div>
    <label for="empAction">Action</label>
    <select id="empAction">
      <option value="praise">Praise professionalism</option>
      <option value="concerns">Ask for concerns</option>
      <option value="shift">Request extra shift</option>
    </select>
    <button id="runContext">Run Scene</button>`);

  const updateCard = () => {
    const e = state.employees[Number($('empSelect').value)];
    $('empCard').innerHTML = `<p><strong>Description:</strong> ${e.description}</p>
    <p><strong>Memories:</strong></p><ul>${renderMemoryList(e)}</ul>`;
  };

  $('empSelect').onchange = updateCard;
  updateCard();

  $('runContext').onclick = async () => {
    const idx = Number($('empSelect').value);
    const action = $('empAction').value;
    const e = state.employees[idx];
    let summary = '';

    if (action === 'praise') {
      e.morale = Math.min(100, e.morale + 8);
      e.trust = Math.min(100, e.trust + 7);
      state.reputation = Math.min(100, state.reputation + 1);
      summary = `Manager praised ${e.name} for disciplined operations and guest handling.`;
    } else if (action === 'concerns') {
      if (e.trust >= 55) {
        e.stress = Math.max(0, e.stress - 11);
        e.morale = Math.min(100, e.morale + 4);
        summary = `${e.name} shared concerns and requested a revised shift strategy.`;
      } else {
        e.trust = Math.min(100, e.trust + 5);
        summary = `${e.name} remained cautious but shared limited feedback.`;
      }
    } else {
      e.stress = Math.min(100, e.stress + 13);
      e.morale = Math.max(0, e.morale - 5);
      state.cash += 600;
      summary = `${e.name} accepted an extra shift to keep operations stable.`;
    }

    appendMemory(e, summary);
    render();
    updateCard();
    await generateScene('Employee Conversation', summary, {
      memoryContext: `${e.name} profile: ${e.description}. Recent memories: ${e.memories.slice(-3).join(' | ')}`,
      roleContext: `${e.name} is acting as ${e.role}. Depict their exact responsibilities while interacting with management.`,
      staticPrompt: `character focus: ${e.name}, role: ${e.role}, task-authentic body language`,
    });
  };
}

function askApplicantContext() {
  const a = randomApplicant();
  const score = Math.round((a.communication + a.reliability + a.teamwork) / 3);

  setContextHtml(`<h2>Applicant Assessment</h2>
    <p><strong>${a.name}</strong> · ${a.role}</p>
    <p>${a.description}</p>
    <p>communication ${a.communication}, reliability ${a.reliability}, teamwork ${a.teamwork}, score ${score}</p>
    <label for="appDecision">Decision</label>
    <select id="appDecision">
      <option value="hire">Hire</option>
      <option value="hold">Hold</option>
      <option value="reject">Reject</option>
    </select>
    <button id="runContext">Run Scene</button>`);

  $('runContext').onclick = async () => {
    const d = $('appDecision').value;
    let summary = '';

    if (d === 'hire') {
      if (score >= 65) {
        state.employees.push({
          name: a.name,
          role: a.role,
          morale: 66,
          trust: 52,
          stress: 34,
          description: a.description,
          memories: [`Day ${state.day}: completed onboarding interview with score ${score}.`],
        });
        state.cash -= 900;
        state.reputation = Math.min(100, state.reputation + 2);
        summary = `Hired ${a.name} as ${a.role} with score ${score}.`;
      } else {
        state.reputation = Math.max(0, state.reputation - 2);
        summary = `Risky hire approved for ${a.name} despite score ${score}.`;
      }
    } else if (d === 'hold') {
      summary = `Applicant ${a.name} placed in talent pool for future staffing.`;
    } else {
      summary = `Applicant ${a.name} rejected after assessment.`;
    }

    render();
    await generateScene('Applicant Assessment', summary, {
      memoryContext: `Applicant profile: ${a.description}`,
      roleContext: `Candidate role target: ${a.role}. Show interview context and role-specific signals of competence.`,
      staticPrompt: `${a.staticPrompt}; role target=${a.role}; interview evaluation setting`,
    });
  };
}

function stopCamStream() {
  if (state.streamTimer) {
    clearInterval(state.streamTimer);
    state.streamTimer = null;
  }
}

async function emitCamFrame(cam, frame) {
  const actionSummary = `Camera ${cam.location} frame ${frame}: ${cam.status}`;
  await generateScene('Security Camera Stream', actionSummary, {
    memoryContext: `Security channel ${cam.location}. Frame ${frame} of low-fps stream simulation.`,
    roleContext: `CCTV operator viewpoint. Show security staff actions and guest flow compliance for ${cam.location}.`,
    staticPrompt: `${cam.staticPrompt}; cctv channel=${cam.location}; frame=${frame}; intentionally low-fps surveillance still; operationally accurate scene`,
    seed: String(frame),
  });
}

function askCamContext() {
  setContextHtml(`<h2>Security Cams</h2>
    <p>Zapp between cameras and stream low-FPS generated frames.</p>
    <label for="camSelect">Camera</label>
    <select id="camSelect">${state.cams.map((c, i) => `<option value="${i}">${c.location}</option>`).join('')}</select>
    <div id="camStatus" class="card"></div>
    <div class="buttons-3">
      <button id="camSingle">Single Snapshot</button>
      <button id="camStream">Start Stream (bad FPS)</button>
      <button id="camStop">Stop Stream</button>
    </div>
    <small>Each frame is a newly generated image to mimic a very low FPS live feed.</small>`);

  const updateCamStatus = () => {
    const cam = state.cams[Number($('camSelect').value)];
    $('camStatus').innerHTML = `<p><strong>${cam.location}</strong> · ${cam.status}</p><p class="muted">Static image directive: ${cam.staticPrompt}</p>`;
  };

  $('camSelect').onchange = async () => {
    updateCamStatus();
    state.streamFrame = 0;
    const cam = state.cams[Number($('camSelect').value)];
    await emitCamFrame(cam, state.streamFrame);
  };

  $('camSingle').onclick = async () => {
    stopCamStream();
    const cam = state.cams[Number($('camSelect').value)];
    state.streamFrame += 1;
    await emitCamFrame(cam, state.streamFrame);
    await generateScene('Security Monitoring', `Manual camera review on ${cam.location}`, {
      memoryContext: `Security review action completed on ${cam.location}.`,
      roleContext: `Security lead validating camera evidence and team positioning at ${cam.location}.`,
      staticPrompt: `${cam.staticPrompt}; manual review mode with evidence-focused framing`,
      seed: String(2000 + state.streamFrame),
    });
  };

  $('camStream').onclick = async () => {
    stopCamStream();
    const cam = state.cams[Number($('camSelect').value)];
    state.streamFrame = 0;
    await emitCamFrame(cam, state.streamFrame);
    state.streamTimer = setInterval(async () => {
      const activeCam = state.cams[Number($('camSelect').value)];
      state.streamFrame += 1;
      await emitCamFrame(activeCam, state.streamFrame);
    }, 1800);
  };

  $('camStop').onclick = () => stopCamStream();
  updateCamStatus();
}

async function advanceDay() {
  stopCamStream();
  state.day += 1;
  const payroll = 550 * state.employees.length;
  const revenue = 2800 + Math.floor(Math.random() * 2501);
  state.cash += revenue - payroll;

  for (const e of state.employees) {
    e.stress = Math.min(100, e.stress + 1 + Math.floor(Math.random() * 6));
    e.morale = Math.max(0, e.morale - Math.floor(Math.random() * 4));
    if (e.stress > 72) state.reputation = Math.max(0, state.reputation - 1);
    appendMemory(e, `Worked day ${state.day}. morale=${e.morale}, stress=${e.stress}.`);
  }

  render();
  await generateScene('End of Day Summary', `Advanced to day ${state.day}; revenue=${revenue}, payroll=${payroll}, net=${revenue - payroll}`, {
    memoryContext: `Team memory counts: ${state.employees.map((e) => `${e.name}:${e.memories.length}`).join(', ')}`,
    roleContext: 'Manager and department leads reviewing operational outcomes by role for the next shift.',
    staticPrompt: 'nightly accounting recap and manager planning board with role-based staffing notes',
  });
}

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    if (action !== 'cams') stopCamStream();
    if (action === 'talk') askEmployeeContext();
    if (action === 'assess') askApplicantContext();
    if (action === 'cams') askCamContext();
    if (action === 'next') {
      setContextHtml('<h2>End of Day</h2><p>Daily payroll/revenue calculations applied and memories updated for all staff.</p>');
      await advanceDay();
    }
  });
});

const saveBtn = $('saveConfig');
if (saveBtn) saveBtn.addEventListener('click', saveConfig);
window.addEventListener('beforeunload', stopCamStream);

render();
setContextHtml('<h2>Ready</h2><p>Select an action. Character memories, static image directives, and dynamic image generation are active for every scene.</p>');
