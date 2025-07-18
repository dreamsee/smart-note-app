// Worker 환경에서 HTML 이스케이프 함수
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 인라인 diff - 단어 단위 비교
function getInlineDiff(original: string, modified: string): string {
  if (!original && !modified) return '&nbsp;';
  if (!original) {
    return `<span class="inline-diff-added">${escapeHtml(modified)}</span>`;
  }
  if (!modified) {
    return `<span class="inline-diff-removed">${escapeHtml(original)}</span>`;
  }
  
  // 단어 단위로 분할
  const originalWords = original.split(/(\s+)/);
  const modifiedWords = modified.split(/(\s+)/);
  
  // 간단한 LCS 알고리즘으로 차이점 찾기
  const maxLength = Math.max(originalWords.length, modifiedWords.length);
  let result = '';
  
  for (let i = 0; i < maxLength; i++) {
    const origWord = originalWords[i] || '';
    const modWord = modifiedWords[i] || '';
    
    if (origWord === modWord) {
      result += escapeHtml(origWord);
    } else {
      if (origWord) {
        result += `<span class="inline-diff-removed">${escapeHtml(origWord)}</span>`;
      }
      if (modWord) {
        result += `<span class="inline-diff-added">${escapeHtml(modWord)}</span>`;
      }
    }
  }
  
  return result || '&nbsp;';
}

interface DiffChunk {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  originalStart: number;
  originalEnd: number;
  modifiedStart: number;
  modifiedEnd: number;
  lines: string[];
}

interface DiffMessage {
  type: 'diff' | 'progress' | 'complete' | 'error' | 'paged-complete' | 'paged-progress';
  data?: any;
  progress?: number;
  error?: string;
}

// 해시 기반 고속 라인 매칭
function createLineHash(line: string): string {
  // 간단한 해시 함수 (실제로는 더 정교한 해시 사용 가능)
  let hash = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  return hash.toString(36);
}

// Myers 알고리즘의 간소화 버전
function computeLCS(original: string[], modified: string[]): Map<number, number> {
  const n = original.length;
  const m = modified.length;
  const matches = new Map<number, number>();
  
  // 해시맵으로 빠른 검색
  const modifiedMap = new Map<string, number[]>();
  for (let i = 0; i < m; i++) {
    const hash = createLineHash(modified[i]);
    if (!modifiedMap.has(hash)) {
      modifiedMap.set(hash, []);
    }
    modifiedMap.get(hash)!.push(i);
  }
  
  // 순차적 매칭으로 LCS 근사
  let lastMatchedModified = -1;
  for (let i = 0; i < n; i++) {
    const hash = createLineHash(original[i]);
    const candidates = modifiedMap.get(hash);
    
    if (candidates) {
      // 가장 가까운 매치 찾기
      for (const j of candidates) {
        if (j > lastMatchedModified) {
          matches.set(i, j);
          lastMatchedModified = j;
          break;
        }
      }
    }
  }
  
  return matches;
}

// 청크 단위 diff 생성
function generateDiffChunks(
  original: string[], 
  modified: string[],
  matches: Map<number, number>
): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let originalIdx = 0;
  let modifiedIdx = 0;
  
  while (originalIdx < original.length || modifiedIdx < modified.length) {
    // 매치된 라인까지의 차이점 처리
    if (matches.has(originalIdx)) {
      const matchedModifiedIdx = matches.get(originalIdx)!;
      
      // 삭제된 라인들
      if (modifiedIdx < matchedModifiedIdx) {
        const removedLines: string[] = [];
        while (modifiedIdx < matchedModifiedIdx && modifiedIdx < modified.length) {
          removedLines.push(modified[modifiedIdx]);
          modifiedIdx++;
        }
        if (removedLines.length > 0) {
          chunks.push({
            type: 'added',
            originalStart: originalIdx,
            originalEnd: originalIdx,
            modifiedStart: modifiedIdx - removedLines.length,
            modifiedEnd: modifiedIdx,
            lines: removedLines
          });
        }
      }
      
      // 매치된 라인 (변경 없음)
      chunks.push({
        type: 'unchanged',
        originalStart: originalIdx,
        originalEnd: originalIdx + 1,
        modifiedStart: modifiedIdx,
        modifiedEnd: modifiedIdx + 1,
        lines: [original[originalIdx]]
      });
      
      originalIdx++;
      modifiedIdx++;
    } else {
      // 삭제된 라인
      chunks.push({
        type: 'removed',
        originalStart: originalIdx,
        originalEnd: originalIdx + 1,
        modifiedStart: modifiedIdx,
        modifiedEnd: modifiedIdx,
        lines: [original[originalIdx]]
      });
      originalIdx++;
    }
  }
  
  // 남은 추가된 라인들
  if (modifiedIdx < modified.length) {
    chunks.push({
      type: 'added',
      originalStart: original.length,
      originalEnd: original.length,
      modifiedStart: modifiedIdx,
      modifiedEnd: modified.length,
      lines: modified.slice(modifiedIdx)
    });
  }
  
  return chunks;
}

// 청크를 HTML로 변환 (페이지용 - 라인 번호 포함)
function chunkToHtml(chunk: DiffChunk, startLineNumber: number = 1): string {
  const lines = chunk.lines.map((line, index) => {
    const lineNumber = startLineNumber + index;
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    switch (chunk.type) {
      case 'added':
        return `<div class="diff-line"><span class="line-number">${lineNumber}</span><span class="diff-added">${escaped || '&nbsp;'}</span></div>`;
      case 'removed':
        return `<div class="diff-line"><span class="line-number">${lineNumber}</span><span class="diff-removed">${escaped || '&nbsp;'}</span></div>`;
      case 'modified':
        return `<div class="diff-line"><span class="line-number">${lineNumber}</span><span class="diff-modified">${escaped || '&nbsp;'}</span></div>`;
      default:
        return `<div class="diff-line"><span class="line-number">${lineNumber}</span>${escaped || '&nbsp;'}</div>`;
    }
  });
  
  return lines.join('\n');
}

// 메인 diff 함수
function performDiff(originalText: string, modifiedText: string) {
  try {
    // 진행 상황 알림
    self.postMessage({ type: 'progress', progress: 0 } as DiffMessage);
    
    // 라인 분할
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');
    
    // 큰 파일 감지
    const totalLines = originalLines.length + modifiedLines.length;
    const isLargeFile = totalLines > 10000;
    
    if (isLargeFile) {
      self.postMessage({ 
        type: 'progress', 
        progress: 10,
        data: { message: '대용량 파일 감지, 최적화된 알고리즘 사용' }
      } as DiffMessage);
    }
    
    // LCS 계산
    self.postMessage({ type: 'progress', progress: 30 } as DiffMessage);
    const matches = computeLCS(originalLines, modifiedLines);
    
    // Diff 청크 생성
    self.postMessage({ type: 'progress', progress: 60 } as DiffMessage);
    const chunks = generateDiffChunks(originalLines, modifiedLines, matches);
    
    // HTML 변환 (스트리밍)
    let html = '';
    const chunkSize = isLargeFile ? 100 : chunks.length;
    
    for (let i = 0; i < chunks.length; i += chunkSize) {
      const batch = chunks.slice(i, i + chunkSize);
      const batchHtml = batch.map(chunk => chunkToHtml(chunk)).join('\n');
      html += batchHtml;
      
      // 진행 상황 업데이트
      const progress = 60 + (40 * (i + chunkSize) / chunks.length);
      self.postMessage({ 
        type: 'progress', 
        progress: Math.min(progress, 99)
      } as DiffMessage);
      
      // 대용량 파일의 경우 중간 결과 전송
      if (isLargeFile && i % 1000 === 0) {
        self.postMessage({
          type: 'diff',
          data: { 
            html: batchHtml,
            isPartial: true,
            chunkIndex: i / chunkSize
          }
        } as DiffMessage);
      }
    }
    
    // 완료
    self.postMessage({
      type: 'complete',
      data: { 
        html,
        stats: {
          originalLines: originalLines.length,
          modifiedLines: modifiedLines.length,
          chunks: chunks.length
        }
      }
    } as DiffMessage);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    } as DiffMessage);
  }
}

// 스트리밍 처리를 위한 청크 크기
const STREAM_CHUNK_SIZE = 100;

// 페이지 단위 diff 처리 (스트리밍 지원)
function performPagedDiff(
  originalText: string,
  modifiedText: string,
  pageNumber: number,
  linesPerPage: number = 15,
  diffMode: 'line' | 'inline' = 'line'
) {
  try {
    // 라인 분할
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');
    
    // 전체 페이지 수 계산
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    const totalPages = maxLines <= 0 ? 1 : Math.ceil(maxLines / linesPerPage);
    
    // 현재 페이지의 라인 범위 계산
    const startLine = pageNumber * linesPerPage;
    const endLine = startLine + linesPerPage;
    
    // 해당 페이지의 라인만 추출
    const pageOriginalLines = originalLines.slice(startLine, endLine);
    const pageModifiedLines = modifiedLines.slice(startLine, endLine);
    
    // 대용량 처리 시 스트리밍 사용
    const isLargeData = maxLines > 1000 || (originalText.length + modifiedText.length) > 500000;
    
    if (isLargeData) {
      performStreamingDiff(pageOriginalLines, pageModifiedLines, pageNumber, totalPages, startLine, diffMode);
      return;
    }
    
    // 일반 처리 (소용량)
    performNormalPagedDiff(pageOriginalLines, pageModifiedLines, pageNumber, totalPages, startLine, endLine, originalLines.length, modifiedLines.length, diffMode);
    
  } catch (error) {
    console.error('performPagedDiff 오류:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? `performPagedDiff: ${error.message}` : '페이지 처리 중 오류가 발생했습니다.'
    } as DiffMessage);
  }
}

// 스트리밍 diff 처리
function performStreamingDiff(
  pageOriginalLines: string[],
  pageModifiedLines: string[],
  pageNumber: number,
  totalPages: number,
  startLine: number,
  diffMode: 'line' | 'inline' = 'line'
) {
  console.log('스트리밍 모드로 처리:', pageOriginalLines.length, '줄');
  
  const maxPageLines = Math.max(pageOriginalLines.length, pageModifiedLines.length);
  let html = '';
  
  // 청크 단위로 처리
  for (let chunkStart = 0; chunkStart < maxPageLines; chunkStart += STREAM_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + STREAM_CHUNK_SIZE, maxPageLines);
    
    // 현재 청크 처리
    for (let i = chunkStart; i < chunkEnd; i++) {
      const lineNumber = startLine + i + 1;
      const originalLine = pageOriginalLines[i] || '';
      const modifiedLine = pageModifiedLines[i] || '';
      
      if (originalLine === modifiedLine) {
        // 동일한 라인
        const escaped = escapeHtml(originalLine || '');
        html += `<div class="line-same">
          <span class="line-number">${lineNumber}</span>
          <span class="line-content">${escaped || '&nbsp;'}</span>
        </div>\n`;
      } else if (originalLine && modifiedLine) {
        // 두 줄 모두 있는 경우
        if (diffMode === 'inline') {
          // 인라인 모드: 단어 단위 diff 표시
          const inlineDiffContent = getInlineDiff(originalLine, modifiedLine);
          html += `<div class="line-modified">
            <span class="line-number">${lineNumber}</span>
            <span class="line-content">${inlineDiffContent}</span>
          </div>\n`;
        } else {
          // 라인 모드: 삭제/추가 라인으로 표시
          const escapedOriginal = escapeHtml(originalLine);
          const escapedModified = escapeHtml(modifiedLine);
          html += `<div class="line-removed">
            <span class="line-number">${lineNumber}-</span>
            <span class="line-content">${escapedOriginal}</span>
          </div>\n`;
          html += `<div class="line-added">
            <span class="line-number">${lineNumber}+</span>
            <span class="line-content">${escapedModified}</span>
          </div>\n`;
        }
      } else {
        // 한쪽만 있는 경우 - 추가/삭제로 표시
        if (originalLine) {
          const escapedOriginal = escapeHtml(originalLine);
          html += `<div class="line-removed">
            <span class="line-number">${lineNumber}-</span>
            <span class="line-content">${escapedOriginal}</span>
          </div>\n`;
        }
        if (modifiedLine) {
          const escapedModified = escapeHtml(modifiedLine);
          html += `<div class="line-added">
            <span class="line-number">${lineNumber}+</span>
            <span class="line-content">${escapedModified}</span>
          </div>\n`;
        }
      }
    }
    
    // 진행률 전송 (중간 결과)
    const progress = (chunkEnd / maxPageLines) * 100;
    self.postMessage({
      type: 'paged-progress',
      data: {
        progress,
        partialHtml: html,
        isComplete: chunkEnd >= maxPageLines
      }
    } as DiffMessage);
  }
  
  // 최종 결과 전송
  self.postMessage({
    type: 'paged-complete',
    data: {
      html,
      pageInfo: {
        currentPage: pageNumber + 1,
        totalPages,
        startLine: startLine + 1,
        endLine: startLine + maxPageLines,
        totalOriginalLines: pageOriginalLines.length,
        totalModifiedLines: pageModifiedLines.length
      }
    }
  } as DiffMessage);
}

// 일반 페이지 diff 처리
function performNormalPagedDiff(
  pageOriginalLines: string[],
  pageModifiedLines: string[],
  pageNumber: number,
  totalPages: number,
  startLine: number,
  endLine: number,
  totalOriginalLines: number,
  totalModifiedLines: number,
  diffMode: 'line' | 'inline' = 'line'
) {
  try {
    // 디버그 로그
    console.log('일반 모드로 페이지 처리:', {
      pageNumber,
      startLine,
      pageOriginalLines: pageOriginalLines.length,
      pageModifiedLines: pageModifiedLines.length,
      sample: pageOriginalLines[0]
    });
    
    const maxPageLines = Math.max(pageOriginalLines.length, pageModifiedLines.length);
    
    // 빈 페이지 처리 (실제 내용이 없는 경우)
    if (maxPageLines === 0) {
      self.postMessage({
        type: 'paged-complete',
        data: {
          html: '<div class="text-gray-500">이 페이지에는 내용이 없습니다.</div>',
          pageInfo: {
            currentPage: pageNumber + 1,
            totalPages,
            startLine: startLine + 1,
            endLine: startLine + 1,
            totalOriginalLines: totalOriginalLines,
            totalModifiedLines: totalModifiedLines
          }
        }
      } as DiffMessage);
      return;
    }
    
    // 페이지 단위로 간단한 diff 계산
    let html = '';
    
    for (let i = 0; i < maxPageLines; i++) {
      const lineNumber = startLine + i + 1;
      const originalLine = pageOriginalLines[i] || '';
      const modifiedLine = pageModifiedLines[i] || '';
      
      if (originalLine === modifiedLine) {
        // 동일한 라인 (변경 없음)
        const escaped = escapeHtml(originalLine || '');
        html += `<div class="line-same">
          <span class="line-number">${lineNumber}</span>
          <span class="line-content">${escaped || '&nbsp;'}</span>
        </div>\n`;
      } else if (originalLine && modifiedLine) {
        // 두 줄 모두 있는 경우
        if (diffMode === 'inline') {
          // 인라인 모드: 단어 단위 diff 표시
          const inlineDiffContent = getInlineDiff(originalLine, modifiedLine);
          html += `<div class="line-modified">
            <span class="line-number">${lineNumber}</span>
            <span class="line-content">${inlineDiffContent}</span>
          </div>\n`;
        } else {
          // 라인 모드: 삭제/추가 라인으로 표시
          const escapedOriginal = escapeHtml(originalLine);
          const escapedModified = escapeHtml(modifiedLine);
          html += `<div class="line-removed">
            <span class="line-number">${lineNumber}-</span>
            <span class="line-content">${escapedOriginal}</span>
          </div>\n`;
          html += `<div class="line-added">
            <span class="line-number">${lineNumber}+</span>
            <span class="line-content">${escapedModified}</span>
          </div>\n`;
        }
      } else {
        // 한쪽만 있는 경우 - 추가/삭제로 표시
        if (originalLine) {
          const escapedOriginal = escapeHtml(originalLine);
          html += `<div class="line-removed">
            <span class="line-number">${lineNumber}-</span>
            <span class="line-content">${escapedOriginal}</span>
          </div>\n`;
        }
        if (modifiedLine) {
          const escapedModified = escapeHtml(modifiedLine);
          html += `<div class="line-added">
            <span class="line-number">${lineNumber}+</span>
            <span class="line-content">${escapedModified}</span>
          </div>\n`;
        }
      }
    }
    
    html = html || '<div class="text-gray-500">이 페이지에는 내용이 없습니다.</div>';
    
    // 결과 전송
    self.postMessage({
      type: 'paged-complete',
      data: {
        html,
        pageInfo: {
          currentPage: pageNumber + 1,
          totalPages,
          startLine: startLine + 1,
          endLine: Math.min(endLine, Math.max(totalOriginalLines, totalModifiedLines)),
          totalOriginalLines: totalOriginalLines,
          totalModifiedLines: totalModifiedLines
        }
      }
    } as DiffMessage);
    
  } catch (error) {
    console.error('performNormalPagedDiff 오류:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? `${error.name}: ${error.message}` : '페이지 diff 처리 중 오류'
    } as DiffMessage);
  }
}

// Worker 메시지 핸들러
self.addEventListener('message', (event) => {
  try {
    const { type, originalText, modifiedText, pageNumber, linesPerPage, diffMode = 'line' } = event.data;
    
    console.log('Worker 메시지 수신:', { type, pageNumber, linesPerPage, diffMode });
    
    if (type === 'diff') {
      performDiff(originalText, modifiedText);
    } else if (type === 'paged-diff') {
      performPagedDiff(originalText, modifiedText, pageNumber, linesPerPage, diffMode);
    } else {
      console.error('알 수 없는 메시지 타입:', type);
      self.postMessage({
        type: 'error',
        error: `알 수 없는 메시지 타입: ${type}`
      });
    }
  } catch (error) {
    console.error('Worker 메시지 처리 오류:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? `Worker: ${error.message}` : 'Worker 메시지 처리 중 오류'
    });
  }
});

// TypeScript를 위한 export
export {};