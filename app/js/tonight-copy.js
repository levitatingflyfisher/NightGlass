// The Tonight card's darkness words. Pure; test/tonight-copy.test.mjs pins
// them. Plain words on the card; the real astronomy term appears only when
// it applies, with one line saying what it means (operator ruling 47).

// darkKind: the deepest darkness the night reaches ("astronomical" = sun
// 18° down, "nautical" = 12°, "civil" = 6°). hasDark: whether even that
// happens tonight.
export function darkness(darkKind, hasDark) {
  if (!hasDark) {
    return {
      label: "Darkness",
      value: "none tonight",
      explain: "The sun never gets 6° below the horizon here tonight, so the sky never gets dark.",
    };
  }
  if (darkKind === "astronomical") return { label: "Fully dark", explain: null };
  if (darkKind === "nautical") {
    return {
      label: "Darkest it gets",
      explain: "Past nautical twilight: the sun gets 12° down but never the 18° of full darkness, so a faint glow stays.",
    };
  }
  return {
    label: "Darkest it gets",
    explain: "Past civil twilight: the sun gets 6° down but never 12°, so the sky stays deep blue and only bright stars show.",
  };
}

// The small line under the best-window headline, after the duration.
export function bestWindowNote(darkKind) {
  return darkKind === "astronomical"
    ? "of moon-free full darkness"
    : "of moon-free darkness (not fully dark)";
}
