
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book, Section, SidebarTab, AISuggestion, VocabularyRecommendation, BookImage } from './types';
import { geminiService } from './geminiService';

const App: React.FC = () => {
  // State
  const [book, setBook] = useState<Book>({
    id: '1',
    title: '새로운 세계의 시작',
    description: '인류가 새로운 행성을 발견하고 정착하며 겪는 감정과 사건들을 다룬 SF 서사시.',
    sections: [
      { id: 'start', title: '프롤로그', subtitle: '차가운 별빛 아래에서', content: '별들은 그가 기억하던 것보다 훨씬 더 차갑게 빛나고 있었다...', images: [] },
      { id: 'sec2', title: '행성 탐사', subtitle: '미지의 대지로', content: '', images: [], currentCollaborator: { name: '박작가', color: 'bg-blue-500' } },
      { id: 'sec3', title: '첫 번째 접촉', subtitle: '그들과의 만남', content: '', images: [], currentCollaborator: { name: '이편집', color: 'bg-purple-500' } }
    ],
    aiPersona: '풍부한 감성 묘사와 생생한 시각적 표현을 중시하는 문학 에디터.',
    targetAudience: 'SF를 즐기는 청년층 및 일반 독자.'
  });

  const [activeSectionId, setActiveSectionId] = useState<string>('start');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarTab, setRightSidebarTab] = useState<SidebarTab>(SidebarTab.AI_ASSISTANT);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [tocSuggestions, setTocSuggestions] = useState<string[]>([]);
  const [showTOCModal, setShowTOCModal] = useState(false);
  const [vocabInput, setVocabInput] = useState('');
  const [vocabResults, setVocabResults] = useState<VocabularyRecommendation[]>([]);
  const [loadingVocab, setLoadingVocab] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSection = book.sections.find(s => s.id === activeSectionId) || book.sections[0];

  // Auto-save simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 800);
    }, 2000);
    return () => clearTimeout(timer);
  }, [book]);

  const refreshSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    const results = await geminiService.getWritingSuggestions(
      activeSection.content,
      activeSection.title,
      book.aiPersona,
      book.description
    );
    setSuggestions(results);
    setLoadingSuggestions(false);
  }, [activeSection.content, activeSection.title, book.aiPersona, book.description]);

  const updateContent = (content: string) => {
    setBook(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, content } : s)
    }));
  };

  const updateActiveSectionField = (field: keyof Section, value: string) => {
    setBook(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, [field]: value } : s)
    }));
  };

  const insertTextAtCursor = (text: string) => {
    updateContent(activeSection.content + (activeSection.content.endsWith(' ') ? '' : ' ') + text);
  };

  const addNewSection = () => {
    const newId = `section-${Date.now()}`;
    const newSection: Section = {
      id: newId,
      title: '새로운 챕터',
      subtitle: '',
      content: '',
      images: []
    };
    setBook(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSectionId(newId);
  };

  const requestTOC = async () => {
    setLoadingSuggestions(true);
    const items = await geminiService.suggestTOC(book.title, book.description);
    setTocSuggestions(items);
    setShowTOCModal(true);
    setLoadingSuggestions(false);
  };

  const applyTOC = () => {
    const newSections = tocSuggestions.map((title, idx) => ({
      id: `section-${idx}-${Date.now()}`,
      title,
      subtitle: '',
      content: '',
      images: []
    }));
    setBook(prev => ({ ...prev, sections: newSections }));
    setActiveSectionId(newSections[0].id);
    setShowTOCModal(false);
  };

  const searchVocab = async () => {
    if (!vocabInput.trim()) return;
    setLoadingVocab(true);
    const results = await geminiService.recommendVocabulary(vocabInput);
    setVocabResults(results);
    setLoadingVocab(false);
  };

  // Drag and Drop handlers
  const onDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newSections = [...book.sections];
    const item = newSections.splice(draggedItemIndex, 1)[0];
    newSections.splice(index, 0, item);
    
    setBook(prev => ({ ...prev, sections: newSections }));
    setDraggedItemIndex(index);
  };

  const onDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // Image handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: BookImage = {
          id: `img-${Date.now()}`,
          url: reader.result as string,
          size: 'md'
        };
        setBook(prev => ({
          ...prev,
          sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, images: [...(s.images || []), newImage] } : s)
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (imgId: string) => {
    setBook(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, images: s.images.filter(img => img.id !== imgId) } : s)
    }));
  };

  const updateImageSize = (imgId: string, size: BookImage['size']) => {
    setBook(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === activeSectionId ? { ...s, images: s.images.map(img => img.id === imgId ? { ...img, size } : img) } : s)
    }));
  };

  const getImageSizeClass = (size: BookImage['size']) => {
    switch (size) {
      case 'sm': return 'w-1/4';
      case 'md': return 'w-1/2';
      case 'lg': return 'w-3/4';
      case 'full': return 'w-full';
      default: return 'w-1/2';
    }
  };

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden font-sans bg-slate-50">
      
      {/* 왼쪽 사이드바 */}
      <aside className={`${leftSidebarOpen ? 'w-full md:w-72' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden absolute md:relative z-40 h-full`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h1 className="font-bold text-emerald-600 tracking-tight text-xl flex items-center gap-2">
            <i className="fas fa-pencil-alt"></i> 우리의 집필실
          </h1>
          <button onClick={() => setLeftSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">목차 구성</span>
            <button onClick={requestTOC} className="text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md transition-colors">AI 추천</button>
          </div>
          {book.sections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              className={`group flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-200 ${draggedItemIndex === index ? 'opacity-40 bg-slate-100 scale-95' : ''} ${activeSectionId === section.id ? 'bg-emerald-600/5' : 'hover:bg-slate-50'}`}
            >
              <i className="fas fa-grip-vertical text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"></i>
              <button
                onClick={() => { setActiveSectionId(section.id); if (window.innerWidth < 768) setLeftSidebarOpen(false); }}
                className={`flex-1 text-left px-2 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between overflow-hidden ${activeSectionId === section.id ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{section.title}</span>
                  {section.subtitle && <span className="text-[10px] text-slate-400 truncate font-normal">{section.subtitle}</span>}
                </div>
                {section.currentCollaborator && (
                  <div className={`w-2 h-2 rounded-full shrink-0 ml-2 animate-pulse ${section.currentCollaborator.color}`}></div>
                )}
              </button>
            </div>
          ))}
          <button 
            onClick={addNewSection}
            className="w-full text-left px-4 py-3 rounded-xl text-sm text-emerald-600 hover:bg-emerald-50 mt-2 border border-dashed border-emerald-200 flex items-center gap-3 transition-colors active:scale-95"
          >
            <i className="fas fa-plus-circle"></i> 새 챕터 추가
          </button>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center space-x-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">김</div>
            <div className="text-xs">
              <p className="font-bold text-slate-700">김작가 (나)</p>
              <p className="text-emerald-500 font-medium text-[10px]">실시간 협업 중</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 에디터 영역 */}
      <main className="flex-1 flex flex-col bg-white h-full relative overflow-hidden">
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <i className={`fas ${leftSidebarOpen ? 'fa-indent' : 'fa-outdent'}`}></i>
            </button>
            <div className="max-w-[150px] md:max-w-md">
              <input 
                type="text" 
                value={book.title} 
                onChange={(e) => setBook({...book, title: e.target.value})}
                className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-lg w-full truncate"
              />
              <div className="flex items-center text-[10px] text-slate-400 space-x-3 mt-0.5">
                <span className="flex items-center"><i className="fas fa-cloud-upload-alt mr-1 text-emerald-500"></i> 클라우드 동기화</span>
                {isSaving ? (
                  <span className="text-emerald-500 flex items-center"><i className="fas fa-circle-notch fa-spin mr-1"></i> 저장 중...</span>
                ) : (
                  <span className="text-emerald-500 flex items-center font-medium"><i className="fas fa-check-circle mr-1"></i> 저장됨</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <i className="fas fa-user-plus text-emerald-500"></i>
              <span className="font-medium">공유</span>
            </button>
            <button className="flex items-center space-x-2 px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md transition-all shadow-emerald-200 font-bold">
              <i className="fas fa-cloud-arrow-up"></i>
              <span className="hidden md:inline">구글 독스에 저장</span>
              <span className="md:hidden">저장</span>
            </button>
          </div>
        </header>

        {/* 에디터 툴바 */}
        <div className="bg-white border-b border-slate-50 px-8 py-2 flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-all text-xs font-bold shrink-0"
          >
            <i className="fas fa-image"></i> 이미지 삽입
          </button>
          <div className="w-px h-4 bg-slate-200 shrink-0"></div>
          <button className="text-slate-500 hover:text-emerald-600 p-1.5 rounded text-xs shrink-0"><i className="fas fa-bold"></i></button>
          <button className="text-slate-500 hover:text-emerald-600 p-1.5 rounded text-xs shrink-0"><i className="fas fa-italic"></i></button>
          <button className="text-slate-500 hover:text-emerald-600 p-1.5 rounded text-xs shrink-0"><i className="fas fa-underline"></i></button>
          <button className="text-slate-500 hover:text-emerald-600 p-1.5 rounded text-xs shrink-0"><i className="fas fa-quote-left"></i></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar">
          <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-8">
            <div className="bg-white min-h-[85vh] editor-shadow border border-slate-100 p-8 md:p-20 rounded-3xl">
              <div className="mb-12">
                <input 
                  type="text"
                  value={activeSection.title}
                  onChange={(e) => updateActiveSectionField('title', e.target.value)}
                  className="w-full text-3xl md:text-5xl font-serif font-bold text-slate-900 border-none focus:ring-0 mb-4 placeholder:text-slate-100"
                  placeholder="챕터 제목을 입력하세요"
                />
                <input 
                  type="text"
                  value={activeSection.subtitle || ''}
                  onChange={(e) => updateActiveSectionField('subtitle', e.target.value)}
                  className="w-full text-lg md:text-2xl font-serif font-medium text-slate-400 border-none focus:ring-0 italic placeholder:text-slate-100"
                  placeholder="소제목을 입력하세요 (선택 사항)"
                />
              </div>

              {/* 삽입된 이미지들 */}
              <div className="mb-8 space-y-6">
                {(activeSection.images || []).map((img) => (
                  <div key={img.id} className={`relative group mx-auto transition-all duration-300 ${getImageSizeClass(img.size)}`}>
                    <img src={img.url} alt="Inserted" className="rounded-2xl shadow-lg w-full border border-slate-100" />
                    
                    <div className="absolute -top-3 -right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeImage(img.id)} className="w-8 h-8 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                        <i className="fas fa-times text-xs"></i>
                      </button>
                      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-1 flex flex-col gap-1">
                        <button onClick={() => updateImageSize(img.id, 'sm')} title="작게" className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold ${img.size === 'sm' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>S</button>
                        <button onClick={() => updateImageSize(img.id, 'md')} title="중간" className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold ${img.size === 'md' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>M</button>
                        <button onClick={() => updateImageSize(img.id, 'lg')} title="크게" className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold ${img.size === 'lg' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>L</button>
                        <button onClick={() => updateImageSize(img.id, 'full')} title="꽉 차게" className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold ${img.size === 'full' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>F</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                value={activeSection.content}
                onChange={(e) => updateContent(e.target.value)}
                className="w-full min-h-[600px] text-lg md:text-xl leading-loose text-slate-700 font-serif border-none focus:ring-0 resize-none p-0 placeholder:text-slate-200"
                placeholder="이곳에 당신의 이야기를 펼쳐보세요..."
              />
            </div>
          </div>
        </div>
      </main>

      {/* 오른쪽 사이드바 */}
      <aside className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-2xl md:shadow-none z-30">
        <div className="flex border-b border-slate-100 h-14 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => setRightSidebarTab(SidebarTab.AI_ASSISTANT)} className={`flex-1 text-xs font-bold flex items-center justify-center gap-2 transition-all ${rightSidebarTab === SidebarTab.AI_ASSISTANT ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-wand-magic-sparkles"></i> 추천 문구
          </button>
          <button onClick={() => setRightSidebarTab(SidebarTab.VOCABULARY)} className={`flex-1 text-xs font-bold flex items-center justify-center gap-2 transition-all ${rightSidebarTab === SidebarTab.VOCABULARY ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-book-open"></i> 낱말 추천
          </button>
          <button onClick={() => setRightSidebarTab(SidebarTab.CONFIG)} className={`flex-1 text-xs font-bold flex items-center justify-center gap-2 transition-all ${rightSidebarTab === SidebarTab.CONFIG ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-sliders-h"></i> 설정
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {rightSidebarTab === SidebarTab.AI_ASSISTANT && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">실시간 문구 제안</h3>
                <button 
                  onClick={refreshSuggestions}
                  disabled={loadingSuggestions}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                >
                  <i className={`fas fa-arrows-rotate ${loadingSuggestions ? 'fa-spin' : ''}`}></i>
                </button>
              </div>

              {suggestions.length === 0 && !loadingSuggestions && (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-300 shadow-sm">
                    <i className="fas fa-magic text-2xl"></i>
                  </div>
                  <p className="text-xs text-slate-400 px-6 leading-relaxed font-medium">글을 조금 더 작성하고 새로고침을 누르면 설정된 페르소나에 맞춰 문구를 추천해 드립니다.</p>
                </div>
              )}

              {loadingSuggestions && (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
                  ))}
                </div>
              )}

              {!loadingSuggestions && suggestions.map((s, idx) => (
                <div key={idx} className="group relative bg-white border border-slate-100 p-5 rounded-2xl hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50 transition-all cursor-pointer shadow-sm active:scale-[0.98]" onClick={() => insertTextAtCursor(s.text)}>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md mb-3 inline-block ${s.type === 'continuation' ? 'bg-emerald-100 text-emerald-700' : s.type === 'phrase' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {s.type === 'continuation' ? '이어쓰기' : s.type === 'phrase' ? '표현 개선' : '아이디어'}
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed italic">"{s.text}"</p>
                </div>
              ))}
            </div>
          )}

          {rightSidebarTab === SidebarTab.VOCABULARY && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-slate-800">낱말 탐색기</h3>
              <div className="relative">
                <input 
                  type="text" 
                  value={vocabInput}
                  onChange={(e) => setVocabInput(e.target.value)}
                  placeholder="예: 가슴이 뭉클한 순간..."
                  className="w-full text-sm border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-12 py-4 shadow-sm transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && searchVocab()}
                />
                <button onClick={searchVocab} disabled={loadingVocab} className="absolute right-2 top-2 bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 disabled:opacity-50">
                  {loadingVocab ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-search"></i>}
                </button>
              </div>
              <div className="space-y-4">
                {vocabResults.map((v, idx) => (
                  <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer shadow-sm group" onClick={() => insertTextAtCursor(v.word)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-600 text-lg">{v.word}</span>
                      <i className="fas fa-plus-circle text-emerald-200 group-hover:text-emerald-500"></i>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mb-1">{v.meaning}</p>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">{v.nuance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightSidebarTab === SidebarTab.CONFIG && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-bold text-slate-800">설정</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 block mb-2 tracking-widest">AI 집필 페르소나</label>
                  <textarea 
                    value={book.aiPersona}
                    onChange={(e) => setBook({...book, aiPersona: e.target.value})}
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px] shadow-sm p-4 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 목차 추천 모달 */}
      {showTOCModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <h3 className="font-bold text-xl">AI 추천 목차 구성</h3>
              <button onClick={() => setShowTOCModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-emerald-700 transition-colors"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {tocSuggestions.map((title, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-8 h-8 bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center rounded-xl shrink-0">{i + 1}</span>
                    <span className="text-sm font-bold text-slate-700">{title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
              <button onClick={() => setShowTOCModal(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700">닫기</button>
              <button onClick={applyTOC} className="px-8 py-3 text-sm font-bold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700">구성 적용하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
