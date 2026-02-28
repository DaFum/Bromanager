#!/usr/bin/env python3
"""Brothel Manager Simulation powered by Pollinations text+image generation.

For every game scene, the simulation requests JSON-mode text generation that returns:
- scene_text: narration/dialogue
- image_prompt: dynamic prompt for image generation

The script then builds a Pollinations image URL from image_prompt and prints it next to
scene_text so every scene has both generated text and generated image output.
"""

from __future__ import annotations

import json
import os
import random
import sys
import textwrap
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class Employee:
    name: str
    role: str
    morale: int = 70
    trust: int = 50
    stress: int = 30

    def status_line(self) -> str:
        return (
            f"{self.name:<12} | {self.role:<14} | morale:{self.morale:>3} "
            f"| trust:{self.trust:>3} | stress:{self.stress:>3}"
        )


@dataclass
class Applicant:
    name: str
    desired_role: str
    communication: int
    reliability: int
    teamwork: int

    def score(self) -> int:
        return round((self.communication + self.reliability + self.teamwork) / 3)


@dataclass
class CameraFeed:
    location: str
    status: str


@dataclass
class SceneOutput:
    scene_text: str
    image_prompt: str
    image_url: str
    model_used: str


@dataclass
class PollinationsClient:
    api_key: Optional[str]
    base_url: str = "https://gen.pollinations.ai"
    text_model: str = "openai-large"
    image_model: str = "flux"
    image_width: int = 1024
    image_height: int = 1024
    temperature: float = 0.8
    timeout_seconds: int = 30

    def headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _request_json(self, url: str, payload: dict) -> dict:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=self.headers(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as response:
            data = response.read().decode("utf-8")
        return json.loads(data)

    def _extract_scene_json(self, api_response: dict) -> Tuple[str, str, str]:
        choices = api_response.get("choices") or []
        if not choices:
            raise ValueError("No choices in API response")

        message = choices[0].get("message") or {}
        content = message.get("content")

        if isinstance(content, list):
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )

        if not isinstance(content, str):
            raise ValueError("Invalid content format from text generation")

        parsed = json.loads(content)
        scene_text = str(parsed.get("scene_text", "")).strip()
        image_prompt = str(parsed.get("image_prompt", "")).strip()
        model_used = str(api_response.get("model", self.text_model)).strip()

        if not scene_text or not image_prompt:
            raise ValueError("JSON output missing scene_text or image_prompt")

        return scene_text, image_prompt, model_used

    def build_image_url(self, prompt: str, seed: int = -1) -> str:
        encoded_prompt = urllib.parse.quote(prompt, safe="")
        query = urllib.parse.urlencode(
            {
                "model": self.image_model,
                "width": self.image_width,
                "height": self.image_height,
                "seed": seed,
                "safe": "false",
                "enhance": "true",
            }
        )
        return f"{self.base_url}/image/{encoded_prompt}?{query}"

    def generate_scene(
        self,
        scene_name: str,
        state_summary: str,
        action_summary: str,
        style_guide: str,
    ) -> SceneOutput:
        system_prompt = textwrap.dedent(
            """
            You are a simulation narrator and visual prompt engineer for a role-driven management sim.
            Respond ONLY with valid JSON using this exact schema:
            {
              "scene_text": "string",
              "image_prompt": "string"
            }

            Requirements:
            - scene_text: 2-5 sentences, grounded in current simulation state and written as strict in-world roleplay narration.
            - image_prompt: detailed clear colorful photorealistic visual prompt matching scene_text, with clear role-accurate worker behavior.
            - Force role-accurate visuals: uniforms, posture, tools, and background tasks must match worker role and scene.
            - Keep both outputs professional and grounded.
            - Include environmental details (lighting, atmosphere, camera angle, texture).
            - Preserve scene intent exactly: each scene must visually match the requested action and game context.
            - Never include markdown, code fences, or extra keys.
            """
        ).strip()

        user_prompt = textwrap.dedent(
            f"""
            Generate the next scene for a brothel manager simulation.

            Scene Type: {scene_name}
            Current State: {state_summary}
            Player Action: {action_summary}
            Style Guide: {style_guide}

            Ensure image_prompt can be sent directly to an image model.
            """
        ).strip()

        payload = {
            "model": self.text_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
            "stream": False,
        }

        try:
            raw = self._request_json(f"{self.base_url}/v1/chat/completions", payload)
            scene_text, image_prompt, model_used = self._extract_scene_json(raw)
        except Exception as exc:
            scene_text = (
                f"Fallback scene ({scene_name}): {action_summary}. "
                f"The staff watches operations closely while the venue atmosphere shifts through the evening."
            )
            image_prompt = (
                f"clear photorealistic interior of a managed brothel, scene {scene_name}, "
                f"bright balanced lighting, vivid natural colors, detailed environment, manager perspective"
            )
            model_used = f"fallback-local ({exc.__class__.__name__})"

        return SceneOutput(
            scene_text=scene_text,
            image_prompt=image_prompt,
            image_url=self.build_image_url(image_prompt),
            model_used=model_used,
        )


class BrothelManagerSimulation:
    def __init__(self, client: PollinationsClient) -> None:
        self.client = client
        self.cash = 18000
        self.reputation = 58
        self.day = 1
        self.employees: Dict[str, Employee] = {
            "Mila": Employee("Mila", "Operations Supervisor", morale=74, trust=61, stress=33),
            "Jordan": Employee("Jordan", "Hospitality Mixologist", morale=69, trust=53, stress=40),
            "Rin": Employee("Rin", "Security Lead", morale=72, trust=57, stress=36),
            "Kai": Employee("Kai", "Client Relations Concierge", morale=76, trust=59, stress=34),
            "Selene": Employee("Selene", "Private Suite Steward", morale=71, trust=56, stress=37),
            "Omar": Employee("Omar", "Housekeeping & Hygiene Lead", morale=73, trust=58, stress=31),
        }
        self.cameras = [
            CameraFeed("Entrance", "steady arrivals and ID checks"),
            CameraFeed("Main Hall", "music, table service, active floor"),
            CameraFeed("Private Corridor", "controlled access and calm flow"),
            CameraFeed("Back Office", "inventory and scheduling review"),
        ]

    def state_summary(self) -> str:
        team_metrics = ", ".join(
            f"{e.name}:{e.role}(morale={e.morale},trust={e.trust},stress={e.stress})"
            for e in self.employees.values()
        )
        return (
            f"day={self.day}, cash={self.cash}, reputation={self.reputation}, "
            f"team=[{team_metrics}]"
        )

    def display_scene(self, scene_name: str, action_summary: str) -> None:
        style_guide = (
            "clear style brothel management sim, colorful photorealistic look, role-authentic staging, "
            "clear visuals, rich atmosphere, realistic operations"
        )
        output = self.client.generate_scene(
            scene_name=scene_name,
            state_summary=self.state_summary(),
            action_summary=action_summary,
            style_guide=style_guide,
        )

        print("\n--- Generated Scene ---")
        print(f"Model: {output.model_used}")
        print(f"Text: {output.scene_text}")
        print(f"Image Prompt: {output.image_prompt}")
        print(f"Image URL: {output.image_url}")

    def print_dashboard(self) -> None:
        print("\n=== Brothel Manager Dashboard ===")
        print(f"Day: {self.day} | Cash: ${self.cash} | Reputation: {self.reputation}")
        print("\nTeam:")
        for employee in self.employees.values():
            print(f"- {employee.status_line()}")

    def talk_to_employee(self) -> None:
        names = list(self.employees.keys())
        print("\nWho do you want to talk to?")
        for i, name in enumerate(names, 1):
            print(f"{i}) {name}")
        pick = input("> ").strip()
        if not pick.isdigit() or int(pick) not in range(1, len(names) + 1):
            print("Invalid selection.")
            return

        employee = self.employees[names[int(pick) - 1]]
        print(f"\nConversation with {employee.name} ({employee.role}):")
        print("1) Praise professionalism")
        print("2) Ask for concerns")
        print("3) Request extra shift")
        act = input("> ").strip()

        if act == "1":
            employee.morale = min(100, employee.morale + 8)
            employee.trust = min(100, employee.trust + 7)
            self.reputation = min(100, self.reputation + 1)
            action = f"Manager praised {employee.name} and boosted morale/trust"
        elif act == "2":
            if employee.trust >= 55:
                employee.stress = max(0, employee.stress - 11)
                employee.morale = min(100, employee.morale + 4)
                action = f"{employee.name} shared concerns and stress dropped"
            else:
                employee.trust = min(100, employee.trust + 5)
                action = f"{employee.name} stayed reserved but trust improved slightly"
        elif act == "3":
            employee.stress = min(100, employee.stress + 13)
            employee.morale = max(0, employee.morale - 5)
            self.cash += 600
            action = f"{employee.name} accepted extra shift for short-term cash gain"
        else:
            action = "Conversation ended without a clear managerial action"

        self.display_scene("Employee Conversation", action)

    def generate_applicant(self) -> Applicant:
        names = ["Avery", "Noor", "Casey", "Sami", "Jules", "Remy", "Parker"]
        roles = [
            "Guest Experience Host",
            "Client Relations Concierge",
            "Security Lead",
            "Hospitality Mixologist",
            "Floor Operations Coordinator",
            "Private Suite Steward",
            "Housekeeping & Hygiene Lead",
        ]
        return Applicant(
            name=random.choice(names),
            desired_role=random.choice(roles),
            communication=random.randint(45, 95),
            reliability=random.randint(45, 95),
            teamwork=random.randint(45, 95),
        )

    def assess_applicant(self) -> None:
        applicant = self.generate_applicant()
        score = applicant.score()
        print("\n--- Applicant Assessment ---")
        print(f"Name: {applicant.name}")
        print(f"Desired Role: {applicant.desired_role}")
        print(
            f"Metrics -> communication={applicant.communication}, reliability={applicant.reliability}, teamwork={applicant.teamwork}, score={score}"
        )
        print("1) Hire")
        print("2) Hold for later")
        print("3) Reject")
        decision = input("> ").strip()

        if decision == "1":
            if score >= 65:
                self.employees[applicant.name] = Employee(
                    applicant.name,
                    applicant.desired_role,
                    morale=66,
                    trust=52,
                    stress=34,
                )
                self.cash -= 900
                self.reputation = min(100, self.reputation + 2)
                action = f"Hired {applicant.name} as {applicant.desired_role} with score {score}"
            else:
                self.reputation = max(0, self.reputation - 2)
                action = f"Risky hire approved for {applicant.name} despite score {score}"
        elif decision == "2":
            action = f"Applicant {applicant.name} placed in talent pool"
        elif decision == "3":
            action = f"Applicant {applicant.name} rejected"
        else:
            action = "No hiring action applied"

        self.display_scene("Applicant Assessment", action)

    def watch_security_cams(self) -> None:
        print("\n--- Security Cameras ---")
        for cam in self.cameras:
            print(f"- {cam.location}: {cam.status}")
        print("1) Dispatch patrol")
        print("2) Continue monitoring")
        response = input("> ").strip()

        if response == "1":
            self.cash -= 250
            self.reputation = min(100, self.reputation + 1)
            action = "Security patrol dispatched after camera scan"
        else:
            action = "Manager continued passive monitoring of camera feeds"

        self.display_scene("Security Monitoring", action)

    def next_day(self) -> None:
        self.day += 1
        payroll = 550 * len(self.employees)
        revenue = random.randint(2800, 5300)
        self.cash += revenue - payroll

        for employee in self.employees.values():
            employee.stress = min(100, employee.stress + random.randint(1, 6))
            employee.morale = max(0, employee.morale - random.randint(0, 3))
            if employee.stress > 72:
                self.reputation = max(0, self.reputation - 1)

        action = f"Advanced to day {self.day}; revenue={revenue}, payroll={payroll}, net={revenue - payroll}"
        self.display_scene("End of Day Summary", action)

    def run(self) -> None:
        print("\n=== Brothel Manager Simulation (Pollinations Edition) ===")
        print("Every scene uses text generation in JSON mode + dynamic image prompt generation.\n")
        while True:
            self.print_dashboard()
            print("\nChoose an action:")
            print("1) Talk to employee")
            print("2) Assess applicant")
            print("3) Watch security cams")
            print("4) Advance day")
            print("5) Quit")
            choice = input("> ").strip()

            if choice == "1":
                self.talk_to_employee()
            elif choice == "2":
                self.assess_applicant()
            elif choice == "3":
                self.watch_security_cams()
            elif choice == "4":
                self.next_day()
            elif choice == "5":
                print("Simulation ended.")
                break
            else:
                print("Unknown option.")


def main() -> int:
    api_key = os.getenv("POLLINATIONS_API_KEY") or os.getenv("POLLINATIONS_KEY")
    if not api_key:
        print(
            "[info] No POLLINATIONS_API_KEY set. Running with online attempt + local fallback mode."
        )

    client = PollinationsClient(api_key=api_key)
    sim = BrothelManagerSimulation(client)
    sim.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
