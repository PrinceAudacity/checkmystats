// Skill data is loaded statically at module time via skillData.js / utils/graph.js.
// This hook exists as a no-op loading shim so App.jsx can remain consistent
// if async loading is introduced later.
export default function useSkillData() {
  return { loading: false }
}
