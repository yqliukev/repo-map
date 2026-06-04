# Avatars

Place employee profile pictures in this folder.

## Naming convention

Files must be named after the employee's `id` field in `graph.json`:

```
<employee_id>.png
```

### Examples

| Employee    | File               |
|-------------|--------------------|
| Alice Chen  | `alice_chen.png`   |
| Bob Kim     | `bob_kim.png`      |
| Charlie Ross| `charlie_ross.png` |
| Dave Patel  | `dave_patel.png`   |
| Eve Johnson | `eve_johnson.png`  |
| Iris Wang   | `iris_wang.png`    |

## Notes

- Recommended size: **200 × 200 px** minimum (square crops work best).
- Supported format: **PNG** (JPEG also works — update the `avatar` path in `graph.json` accordingly).
- Images are clipped to a circle in the graph UI, so center the face in the frame.
- Employees **without** a file here will automatically fall back to the initials + team-colour circle.