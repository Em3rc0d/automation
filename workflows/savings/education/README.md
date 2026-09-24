# education Savings Workflows

Materialized DESIGN_READY skeletons: **10**

- [STUDENT_REGISTRATION_AUTOMATION@0.1](./STUDENT_REGISTRATION_AUTOMATION@0.1/) — Student Registration — unit: `student` — runtime: `function`
- [STUDENT_GROUP_ASSIGNMENT_AUTOMATION@0.1](./STUDENT_GROUP_ASSIGNMENT_AUTOMATION@0.1/) — Student Group Assignment — unit: `student` — runtime: `function`
- [CLASS_REMINDER_AUTOMATION@0.1](./CLASS_REMINDER_AUTOMATION@0.1/) — Class Reminder — unit: `student/class` — runtime: `scheduled`
- [CLASS_ATTENDANCE_AUTOMATION@0.1](./CLASS_ATTENDANCE_AUTOMATION@0.1/) — Class Attendance Registration — unit: `student/class` — runtime: `function`
- [CLASS_MATERIAL_DELIVERY_AUTOMATION@0.1](./CLASS_MATERIAL_DELIVERY_AUTOMATION@0.1/) — Post-class Material Delivery — unit: `class` — runtime: `durable`
- [CLASS_RECORDING_DELIVERY_AUTOMATION@0.1](./CLASS_RECORDING_DELIVERY_AUTOMATION@0.1/) — Class Recording Delivery — unit: `class` — runtime: `durable`
- [CLASS_MATERIAL_WATCHDOG_AUTOMATION@0.1](./CLASS_MATERIAL_WATCHDOG_AUTOMATION@0.1/) — Material Pending Watchdog — unit: `class` — runtime: `scheduled`
- [CLASS_RESCHEDULE_AUTOMATION@0.1](./CLASS_RESCHEDULE_AUTOMATION@0.1/) — Class Reschedule — unit: `class` — runtime: `durable`
- [CLASS_CANCEL_AUTOMATION@0.1](./CLASS_CANCEL_AUTOMATION@0.1/) — Class Cancellation — unit: `class` — runtime: `function`
- [ASSIGNMENT_REMINDER_AUTOMATION@0.1](./ASSIGNMENT_REMINDER_AUTOMATION@0.1/) — Assignment Reminder — unit: `student/task` — runtime: `scheduled`

Skeletons are not production-certified implementations.
