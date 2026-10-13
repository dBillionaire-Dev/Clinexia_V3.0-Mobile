# Finds a JDK this project's Gradle can run on and exports JAVA_HOME (+ PATH) for it.
# Source it:   . scripts/find-jdk.sh && clinexia_use_jdk || exit 1
#
# Why: Capacitor 8 needs Java 21 or newer, but the Gradle in this project (8.14.x) cannot run on
# Java 25 ("Unsupported class file major version 69"). The usable range is 21 to 24, and 21 is best.
# Plain `java` on your PATH is often a newer JDK, so it must not be trusted blindly.
#
# Override with:  CLINEXIA_JDK_HOME=/path/to/jdk-21 pnpm release:apk

JDK_MIN=21
JDK_MAX=24

# Prints the major Java version of the JDK at $1 (empty if it is not a working JDK).
clinexia_jdk_major() {
  local home="$1" out v
  [ -x "$home/bin/java" ] || return 0
  out="$("$home/bin/java" -version 2>&1 | head -1)" || return 0
  v="$(printf '%s' "$out" | sed -n 's/.*version "\([^"]*\)".*/\1/p')"
  [ -n "$v" ] || return 0
  case "$v" in
    1.*) printf '%s\n' "$v" | cut -d. -f2 ;;
    *)   printf '%s\n' "$v" | cut -d. -f1 | cut -d- -f1 ;;
  esac
}

# Prints every place a JDK might live, one per line (may include paths that do not exist).
clinexia_jdk_candidates() {
  [ -n "${CLINEXIA_JDK_HOME:-}" ] && printf '%s\n' "$CLINEXIA_JDK_HOME"
  [ -n "${JAVA_HOME:-}" ] && printf '%s\n' "$JAVA_HOME"

  # Android Studio's bundled JDK (Linux, Snap, macOS)
  printf '%s\n' \
    "$HOME/android-studio/jbr" "/opt/android-studio/jbr" "/usr/local/android-studio/jbr" \
    "/snap/android-studio/current/android-studio/jbr" \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home"

  # Android Studio installed through JetBrains Toolbox
  local d
  for d in "$HOME"/.local/share/JetBrains/Toolbox/apps/*/ch-*/*/jbr \
           "$HOME"/Library/Application\ Support/JetBrains/Toolbox/apps/*/ch-*/*/*/Contents/jbr/Contents/Home; do
    [ -d "$d" ] && printf '%s\n' "$d"
  done

  # SDKMAN, system JVM folders, macOS (CLINEXIA_JDK_NO_SYSTEM=1 skips the system folders; used by tests)
  for d in "$HOME"/.sdkman/candidates/java/*; do
    [ -d "$d" ] && printf '%s\n' "$d"
  done
  if [ -z "${CLINEXIA_JDK_NO_SYSTEM:-}" ]; then
    for d in /usr/lib/jvm/* /usr/local/lib/jvm/* /opt/jdk* /opt/java/* \
             /Library/Java/JavaVirtualMachines/*/Contents/Home; do
      [ -d "$d" ] && printf '%s\n' "$d"
    done
    # macOS helper
    if [ -x /usr/libexec/java_home ]; then
      /usr/libexec/java_home -v "$JDK_MIN" 2>/dev/null || true
    fi
  fi

  # Whatever `java` is first on the PATH (checked like any other candidate)
  if command -v java >/dev/null 2>&1; then
    local j; j="$(readlink -f "$(command -v java)" 2>/dev/null || command -v java)"
    printf '%s\n' "$(dirname "$(dirname "$j")")"
  fi
}

# Prints the best JDK home: Java 21 first, then 22, 23, 24. Prints nothing if none qualifies.
clinexia_find_jdk() {
  local want c m
  for want in 21 22 23 24; do
    while IFS= read -r c; do
      [ -n "$c" ] || continue
      m="$(clinexia_jdk_major "$c")"
      [ "$m" = "$want" ] && { printf '%s\n' "$c"; return 0; }
    done < <(clinexia_jdk_candidates)
  done
  return 0
}

clinexia_jdk_help() {
  cat >&2 <<HELP
✗ No suitable JDK found. This project needs Java $JDK_MIN to $JDK_MAX (21 is best).
  Found on PATH: $(command -v java >/dev/null 2>&1 && java -version 2>&1 | head -1 || echo "no java")

  Easiest fixes (pick one):
    • Android Studio: install it (it bundles a JDK 21), then run this again.
    • SDKMAN:         curl -s https://get.sdkman.io | bash   then   sdk install java 21-tem
    • Debian/Ubuntu:  sudo apt install openjdk-21-jdk
    • macOS (brew):   brew install --cask temurin@21
  Or point to one you already have:   CLINEXIA_JDK_HOME=/path/to/jdk-21 pnpm release:apk
HELP
}

# Exports JAVA_HOME and PATH. Returns non-zero (after explaining) if no suitable JDK exists.
clinexia_use_jdk() {
  local jdk m
  jdk="$(clinexia_find_jdk)"
  if [ -z "$jdk" ]; then clinexia_jdk_help; return 1; fi
  m="$(clinexia_jdk_major "$jdk")"

  if [ -n "${JAVA_HOME:-}" ] && [ "$JAVA_HOME" != "$jdk" ]; then
    local cur; cur="$(clinexia_jdk_major "$JAVA_HOME")"
    echo "  note: JAVA_HOME (${cur:-unknown}) is not usable with this Gradle; using JDK $m instead." >&2
  elif [ -z "${JAVA_HOME:-}" ] && command -v java >/dev/null 2>&1; then
    local path_major; path_major="$(java -version 2>&1 | head -1 | sed -n 's/.*version "\([0-9]*\).*/\1/p')"
    if [ -n "$path_major" ] && { [ "$path_major" -lt "$JDK_MIN" ] || [ "$path_major" -gt "$JDK_MAX" ]; }; then
      echo "  note: java on your PATH is $path_major (not supported by this Gradle); using JDK $m instead." >&2
    fi
  fi

  export JAVA_HOME="$jdk"
  export PATH="$JAVA_HOME/bin:$PATH"
  echo "  JDK $m: $JAVA_HOME"
}
