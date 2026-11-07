use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MachineState {
    Running,
    Idle,
    Fault,
    Offline,
}

impl std::fmt::Display for MachineState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MachineState::Running => write!(f, "running"),
            MachineState::Idle => write!(f, "idle"),
            MachineState::Fault => write!(f, "fault"),
            MachineState::Offline => write!(f, "offline"),
        }
    }
}

#[allow(dead_code)]
pub struct Machine {
    pub id: String,
    pub name: String,
    pub machine_type: String,
    pub ideal_cycle_time_seconds: f64,
    pub order_id: String,
    pub state: MachineState,
    pub state_since_sim: DateTime<Utc>,
    pub counter_total: u64,
    pub counter_good: u64,
    pub source_seq: u64,
    cycle_accumulator: f64,
}

impl Machine {
    pub fn new(
        id: String,
        name: String,
        machine_type: String,
        ideal_cycle_time_seconds: f64,
        order_id: String,
        sim_time: DateTime<Utc>,
    ) -> Self {
        Self {
            id,
            name,
            machine_type,
            ideal_cycle_time_seconds,
            order_id,
            state: MachineState::Idle,
            state_since_sim: sim_time,
            counter_total: 0,
            counter_good: 0,
            source_seq: 0,
            cycle_accumulator: 0.0,
        }
    }

    pub fn advance(&mut self, elapsed_sim_seconds: f64) -> u64 {
        self.source_seq += 1;

        if self.state != MachineState::Running {
            return 0;
        }

        let mut rng = rand::thread_rng();
        self.cycle_accumulator += elapsed_sim_seconds;

        let mut units_added = 0u64;
        while self.cycle_accumulator >= self.ideal_cycle_time_seconds {
            self.counter_total += 1;
            let quality_rate: f64 = rng.gen_range(0.95..=0.99);
            if rng.gen_bool(quality_rate) {
                self.counter_good += 1;
            }
            self.cycle_accumulator -= self.ideal_cycle_time_seconds;
            units_added += 1;
        }

        units_added
    }

    pub fn transition(&mut self, new_state: MachineState, sim_time: DateTime<Utc>) -> bool {
        if self.state == new_state {
            return false;
        }
        self.state = new_state;
        self.state_since_sim = sim_time;
        if self.state != MachineState::Running {
            self.cycle_accumulator = 0.0;
        }
        true
    }
}
