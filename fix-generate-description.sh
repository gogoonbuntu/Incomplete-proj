#!/bin/bash

# This script fixes the TypeScript error in the project-description-updater.ts file
# by updating the generateDescription method to return a string instead of an object

# Path to the file
FILE_PATH="./lib/services/project-description-updater.ts"

# Create a backup
cp "$FILE_PATH" "${FILE_PATH}.bak"

# Replace the generateDescription method implementation
cat > temp.ts << 'EOL'
  /**
   * AI를 사용하여 설명 생성
   * @param aiService AI 서비스 인스턴스
   * @param originalDescription 원본 설명
   * @param readme README 내용
   * @param projectName 프로젝트 이름
   * @param language 생성할 언어 (korean 또는 english)
   * @returns 생성된 설명 또는 null(실패 시)
   */
  private async generateDescription(
    aiService: any,
    originalDescription: string,
    readme: string,
    projectName: string,
    language: string
  ): Promise<string | null> {
    try {
      // AI 프롬프트 구성
      const prompt = `다음 프로젝트에 대한 설명을 ${language === 'korean' ? '한국어' : '영어'}로 작성해주세요.
      
      프로젝트 이름: ${projectName}
      기존 설명: ${originalDescription || '(없음)'}
      
      README 내용:
      ${readme}
      
      요구사항:
      1. 프로젝트의 목적과 주요 기능을 명확하게 설명해주세요.
      2. 기술 스택이나 사용된 라이브러리가 있다면 포함해주세요.
      3. 200자 이내로 간결하게 작성해주세요.
      4. 다음 형식으로 응답해주세요:
      ---${language === 'korean' ? '한국어' : '영어'}---
      (생성된 설명)`;
      
      // AI 응답 생성
      const response = await aiService.generateText(prompt);
      
      if (!response) {
        logger.warn("AI 응답이 없습니다.");
        return null;
      }
      
      // language에 따라 해당 언어의 설명만 추출
      if (language === 'korean') {
        const koreanMatch = response.match(/---한국어---([\s\S]*?)(?:---영어---|$)/);
        const koreanDescription = koreanMatch ? koreanMatch[1].trim() : '';
        
        if (!koreanDescription) {
          logger.warn("AI가 한국어 설명을 올바른 형식으로 응답하지 않았습니다.");
          return null;
        }
        
        return koreanDescription;
      } else {
        const englishMatch = response.match(/---영어---([\s\S]*?)$/);
        const englishDescription = englishMatch ? englishMatch[1].trim() : '';
        
        if (!englishDescription) {
          logger.warn("AI가 영어 설명을 올바른 형식으로 응답하지 않았습니다.");
          return null;
        }
        
        return englishDescription;
      }
    } catch (error) {
      logger.error("AI를 사용한 설명 생성 중 오류:", error);
      return null;
    }
  }
EOL

# Find the line number where the generateDescription method starts
START_LINE=$(grep -n "private async generateDescription" "$FILE_PATH" | cut -d':' -f1)

# Find the line number where the method ends (the next method starts)
END_LINE=$(tail -n +$START_LINE "$FILE_PATH" | grep -n "private async" | head -n 1 | cut -d':' -f1)
END_LINE=$((START_LINE + END_LINE - 2))

# Create the new file with the replacement
head -n $((START_LINE - 1)) "$FILE_PATH" > "${FILE_PATH}.new"
cat temp.ts >> "${FILE_PATH}.new"
tail -n +$((END_LINE + 1)) "$FILE_PATH" >> "${FILE_PATH}.new"

# Replace the original file
mv "${FILE_PATH}.new" "$FILE_PATH"

# Clean up
rm temp.ts

echo "Fixed generateDescription method in $FILE_PATH"
echo "Backup saved as ${FILE_PATH}.bak"
