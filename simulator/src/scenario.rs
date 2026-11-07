use chrono::{DateTime, Utc};

use crate::machine::MachineState;

#[derive(Debug, Clone)]
pub struct ScriptedDowntime {
    pub machine_id: String,
    pub category_code: String,
    pub description: String,
    pub offset_seconds: f64,
    pub duration_seconds: f64,
    pub state_during: MachineState,
    pub triggered: bool,
    pub ended: bool,
}

pub struct DemoScenario {
    pub shift_start_sim: DateTime<Utc>,
    pub shift_duration_seconds: f64,
    events: Vec<ScriptedDowntime>,
}

impl DemoScenario {
    pub fn new(shift_start_sim: DateTime<Utc>) -> Self {
        // Shift: 06:00–14:00 IST (8h = 28800s), 30min lunch + 2×10min breaks
        // ME-01: M001 mechanical fault at ~07:45 IST = 105min = 6300s, duration 22min = 1320s
        // MA-01: M002 material shortage at ~09:30 IST = 210min = 12600s, duration 18min = 1080s
        // CH-04: M003 changeover at ~11:15 IST = 315min = 18900s, duration 15min = 900s
        let events = vec![
            ScriptedDowntime {
                machine_id: "M001".to_string(),
                category_code: "ME-01".to_string(),
                description: "Mechanical fault — bearing seizure".to_string(),
                offset_seconds: 6300.0,
                duration_seconds: 1320.0,
                state_during: MachineState::Fault,
                triggered: false,
                ended: false,
            },
            ScriptedDowntime {
                machine_id: "M002".to_string(),
                category_code: "MA-01".to_string(),
                description: "Material shortage — raw stock depleted".to_string(),
                offset_seconds: 12600.0,
                duration_seconds: 1080.0,
                state_during: MachineState::Idle,
                triggered: false,
                ended: false,
            },
            ScriptedDowntime {
                machine_id: "M003".to_string(),
                category_code: "CH-04".to_string(),
                description: "Changeover — trial run in progress".to_string(),
                offset_seconds: 18900.0,
                duration_seconds: 900.0,
                state_during: MachineState::Idle,
                triggered: false,
                ended: false,
            },
        ];

        Self {
            shift_start_sim,
            shift_duration_seconds: 8.0 * 3600.0,
            events,
        }
    }

    pub fn elapsed_sim_seconds(&self, sim_time: DateTime<Utc>) -> f64 {
        sim_time
            .signed_duration_since(self.shift_start_sim)
            .num_milliseconds() as f64
            / 1000.0
    }

    pub fn is_shift_active(&self, sim_time: DateTime<Utc>) -> bool {
        let elapsed = self.elapsed_sim_seconds(sim_time);
        elapsed >= 0.0 && elapsed < self.shift_duration_seconds
    }

    pub fn poll_events_to_start(&mut self, sim_time: DateTime<Utc>) -> Vec<ScriptedDowntime> {
        let elapsed = self.elapsed_sim_seconds(sim_time);
        let mut fired = Vec::new();
        for event in &mut self.events {
            if !event.triggered && elapsed >= event.offset_seconds {
                event.triggered = true;
                fired.push(event.clone());
            }
        }
        fired
    }

    pub fn poll_events_to_end(&mut self, sim_time: DateTime<Utc>) -> Vec<ScriptedDowntime> {
        let elapsed = self.elapsed_sim_seconds(sim_time);
        let mut ended = Vec::new();
        for event in &mut self.events {
            if event.triggered && !event.ended {
                if elapsed >= event.offset_seconds + event.duration_seconds {
                    event.ended = true;
                    ended.push(event.clone());
                }
            }
        }
        ended
    }
}
