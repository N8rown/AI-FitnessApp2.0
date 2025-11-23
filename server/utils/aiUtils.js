// Utilities to extract and sanitize JSON-like output from LLM responses
export function stripCodeFences(text) {
  return text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
}

// Find the first balanced JSON object in the text (matching braces)
export function extractJsonBlock(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return null;
}

// Make a best-effort cleanup to help JSON.parse succeed for common LLM outputs
export function sanitizeJsonString(jsonStr) {
  let s = jsonStr;
  // Remove code fences
  s = stripCodeFences(s);

  // Unescape quotes that are escaped (common in some LLM outputs)
  // e.g. {\"key\": \"value\"} -> {"key": "value"}
  s = s.replace(/(?<!\\)\\"/g, '"');

  // Handle newlines inside strings: replace actual newlines with \n
  s = s.replace(/"((?:[^"\\]|\\[\s\S])*)"/g, (match, content) => {
    return '"' + content.replace(/\r?\n/g, '\\n') + '"';
  });

  // Replace literal \n characters (often from LLMs) with spaces, but preserve escaped newlines (\\n)
  s = s.replace(/(?<!\\)\\n/g, ' ');

  // Replace unescaped single quotes with double quotes (best-effort)
  // but avoid touching contractions inside words by targeting property style
  s = s.replace(/\b'([^']+)'\b/g, '"$1"');
  // Replace numeric ranges like 8-12 with a string "8-12" ONLY if they follow a colon (value context)
  s = s.replace(/:\s*(\d+)\s*-\s*(\d+)/g, ': "$1-$2"');
  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,\s*(}[,\]]?)/g, '$1');
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

// Basic XML parser fallback
function parseAiXml(text) {
  try {
    // Look for <focus>...</focus>
    const focusMatch = text.match(/<focus>(.*?)<\/focus>/s);
    const focus = focusMatch ? focusMatch[1].trim() : 'General';

    // Look for exercises
    const exercises = [];
    // Match all <exercise>...</exercise> blocks
    const exerciseRegex = /<exercise>(.*?)<\/exercise>/gs;
    let match;
    while ((match = exerciseRegex.exec(text)) !== null) {
      const exContent = match[1];
      const nameMatch = exContent.match(/<name>(.*?)<\/name>/s);
      const setsMatch = exContent.match(/<sets>(.*?)<\/sets>/s);
      const repsMatch = exContent.match(/<reps>(.*?)<\/reps>/s);
      
      if (nameMatch) {
        exercises.push({
          name: nameMatch[1].trim(),
          sets: setsMatch ? setsMatch[1].trim() : "3",
          reps: repsMatch ? repsMatch[1].trim() : "10"
        });
      }
    }

    if (exercises.length > 0) {
      return { focus, exercises };
    }
  } catch (e) {
    console.error("XML parsing failed", e);
  }
  return null;
}

export function parseAiJson(content) {
  if (!content || typeof content !== 'string') return null;
  // Try to extract a JSON block first
  let block = extractJsonBlock(content);
  if (!block) {
    // maybe the whole content is JSON-like
    block = content;
  }

  // Try direct parse first
  try {
    return JSON.parse(block);
  } catch (e) {
    // Try sanitization
    const sanitized = sanitizeJsonString(block);
    try {
      return JSON.parse(sanitized);
    } catch (e2) {
      // give one more attempt: wrap top-level if missing
      try {
        const wrapped = sanitized.trim();
        if (!wrapped.startsWith('{') && wrapped.startsWith('[')) {
          return JSON.parse(wrapped);
        }
      } catch (e3) {
        // Fallback to XML parsing if JSON fails completely
        const xmlParsed = parseAiXml(content);
        if (xmlParsed) return xmlParsed;
      }
    }
  }
  return null;
}

export default { stripCodeFences, extractJsonBlock, sanitizeJsonString, parseAiJson };
