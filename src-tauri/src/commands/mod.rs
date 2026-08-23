//! Tauri command surface, grouped by domain.
//!
//! All commands are pure routing: they validate inputs and delegate to
//! `services::*` for business logic. They never contain business logic
//! themselves.

pub mod app;
pub mod dialogue;
pub mod file;
pub mod image;
pub mod video;
