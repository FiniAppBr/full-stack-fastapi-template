#!/usr/bin/env python3
"""
Nina Extraction Stress Test - 30 scenarios simulating real WhatsApp behavior.

Categories:
- Happy path variations (1-5)
- Objection handling (6-10)
- Edge cases & weird behavior (11-15)
- Informal/typos/audio style (16-20)
- Nuanced/ambiguous (21-25)
- Fast/slow converters (26-30)

Each scenario has 10 turns with expected extraction results.

Usage:
    cd /opt/connectai/backend
    source .venv/bin/activate
    python scripts/stress_test_nina.py
    python scripts/stress_test_nina.py --scenario 5  # Run specific scenario
    python scripts/stress_test_nina.py --summary     # Show pass/fail summary only
"""

import sys
import os
import argparse
from dataclasses import dataclass
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv("/opt/connectai/.env")

from app.agent.schema import RuntimeState
from app.agent.pipeline import extract
from app.agent.configs import NINA_CONFIG, create_nina_initial_state


@dataclass
class ExpectedResult:
    """Expected extraction result for a turn."""
    intent: Optional[str] = None
    objection_type: Optional[str] = None
    interest_level: Optional[str] = None
    skill_level: Optional[str] = None
    use_case: Optional[str] = None
    customer_name: Optional[str] = None
    mode_after: Optional[str] = None  # Expected mode after this turn
    gates_set: list[str] = None  # Gates expected to be True after this turn

    def __post_init__(self):
        if self.gates_set is None:
            self.gates_set = []


@dataclass
class Turn:
    """A single turn in a conversation."""
    user_message: str
    assistant_response: str  # Simulated response for history
    expected: ExpectedResult


@dataclass
class Scenario:
    """A test scenario with multiple turns."""
    id: int
    name: str
    description: str
    category: str
    turns: list[Turn]


# =============================================================================
# SCENARIOS
# =============================================================================

SCENARIOS = [
    # =========================================================================
    # CATEGORY 1: HAPPY PATH VARIATIONS (1-5)
    # =========================================================================

    Scenario(
        id=1,
        name="Igreja - Fluxo Perfeito",
        description="Ideal customer journey for church musician",
        category="happy_path",
        turns=[
            Turn("Oi! Vi o anúncio do curso de violão",
                 "Oi! Que bom te ver por aqui! O curso é incrível. Você já toca alguma coisa?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Não, nunca peguei num violão na vida",
                 "Sem problema! O curso é justamente pra quem tá começando do zero. O que te motivou a querer aprender?",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("Quero tocar na igreja, no louvor",
                 "Que lindo! Tocar no louvor é uma das motivações mais especiais. Muitos alunos nossos começaram assim.",
                 ExpectedResult(intent="other", use_case="igreja", gates_set=["skill_identified", "need_identified"])),
            Turn("É mesmo? E funciona pra quem nunca tocou?",
                 "Com certeza! O método do Rafael é focado em iniciantes. Em poucas semanas você já toca suas primeiras músicas.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Interessante! Me conta mais sobre o curso",
                 "O curso tem mais de 100 aulas em vídeo, do básico ao fingerstyle. Você aprende no seu ritmo.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Parece bom! Acho que quero tentar",
                 "Que ótimo! Fico feliz que tenha gostado. Posso te passar mais detalhes?",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Sim, quanto custa?",
                 "O investimento é de 12x de R$19,90. E tem garantia de 7 dias!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Tá bom, vou fazer a inscrição",
                 "Perfeito! Aqui está o link: [link]. Qualquer dúvida me chama!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Feito! Já me inscrevi",
                 "Parabéns pela decisão! Bem-vindo à família! Vou te mandar o acesso.",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("Obrigado! Ansioso pra começar",
                 "Vai ser incrível! Qualquer dúvida, estou aqui. Bons estudos!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    Scenario(
        id=2,
        name="Hobby - Aposentado",
        description="Retired person wanting to learn for fun",
        category="happy_path",
        turns=[
            Turn("Boa tarde, tenho 62 anos e sempre quis aprender violão",
                 "Boa tarde! Que maravilha! Nunca é tarde pra realizar um sonho. Você já tentou aprender antes?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Tentei uma vez há 30 anos mas desisti",
                 "Entendo! Muita gente desistiu por métodos antigos. Hoje é diferente. O que te fez querer tentar de novo?",
                 ExpectedResult(intent="question", skill_level="beginner")),
            Turn("Agora aposentado tenho tempo, quero um hobby",
                 "Perfeito! Violão é um hobby incrível. Relaxa, exercita a mente. Quanto tempo você teria por dia?",
                 ExpectedResult(intent="other", use_case="hobby", gates_set=["skill_identified", "need_identified"])),
            Turn("Umas 2 horas tranquilo",
                 "Excelente! Com 2 horas você vai evoluir super rápido. O curso é todo online, você faz no seu ritmo.",
                 ExpectedResult(intent="other", interest_level="warm")),
            Turn("Online é bom, não preciso sair de casa",
                 "Exatamente! Assiste do celular, tablet ou computador. E pode reassistir quantas vezes quiser.",
                 ExpectedResult(intent="agreement", interest_level="warm")),
            Turn("Gostei! E o professor é bom?",
                 "O Rafael é incrível! Mais de 50 mil alunos já passaram pelo curso dele.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Impressionante. Vou pensar e te falo",
                 "Claro! Fico à disposição. Qualquer dúvida é só chamar.",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("Pensei aqui... vou fazer sim!",
                 "Que notícia boa! Vai adorar. Posso te mandar o link?",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Manda sim",
                 "Aqui está: [link]. O pagamento é seguro, pode confiar!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Prontinho, paguei aqui",
                 "Parabéns! Bem-vindo! Seu acesso já está liberado.",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=3,
        name="Profissional - Músico Iniciante",
        description="Young person wanting music career",
        category="happy_path",
        turns=[
            Turn("E aí, quero virar músico profissional",
                 "Fala! Que objetivo incrível! Você já toca algum instrumento?",
                 ExpectedResult(intent="greeting", use_case="profissional", interest_level="hot")),
            Turn("Toco um pouquinho de violão, sei uns acordes básicos",
                 "Legal! Então você já tem uma base. O curso vai te levar pro próximo nível.",
                 ExpectedResult(intent="question", skill_level="beginner", gates_set=["skill_identified", "need_identified"])),
            Turn("Quero aprender fingerstyle, aqueles solos bonitos",
                 "Fingerstyle é lindo! O curso tem um módulo inteiro dedicado a isso.",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("Massa! Em quanto tempo eu aprendo?",
                 "Depende da dedicação, mas em 3-6 meses você já toca músicas completas em fingerstyle.",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("Show! Qual o valor?",
                 "O investimento é de 12x de R$19,90 ou R$197 à vista.",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Cabe no bolso. Tem certificado?",
                 "Tem sim! Certificado de conclusão reconhecido.",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("Perfeito. Manda o link",
                 "Aqui está: [link]. Bora realizar esse sonho!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Comprando aqui...",
                 "Boa! Qualquer problema me avisa.",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Deu certo!",
                 "Parabéns! Agora é só começar. O acesso tá no seu email.",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("Valeu! Vou arrasar",
                 "Com certeza vai! Bons estudos!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    Scenario(
        id=4,
        name="Família - Pai quer tocar com filho",
        description="Parent wanting to bond with child through music",
        category="happy_path",
        turns=[
            Turn("Oi, meu filho de 12 anos quer aprender violão e eu queria aprender junto",
                 "Oi! Que ideia linda! Aprender junto é muito especial. Vocês já tocam algo?",
                 ExpectedResult(intent="greeting", use_case="familia", interest_level="warm")),
            Turn("Nenhum dos dois, somos zero",
                 "Perfeito pra começar juntos então! O curso é ideal pra iniciantes.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified", "need_identified"])),
            Turn("O acesso serve pra nós dois?",
                 "Sim! Com uma conta vocês podem assistir juntos ou separados.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Ótimo! Meu filho fica empolgado fácil mas desiste rápido",
                 "Entendo! O curso tem aulas curtas e músicas conhecidas pra manter o interesse.",
                 ExpectedResult(intent="objection", objection_type="method", interest_level="warm")),
            Turn("Isso é bom. E se a gente não gostar?",
                 "Tem garantia de 7 dias! Se não gostar, devolvemos o dinheiro.",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="warm")),
            Turn("Justo. Quanto custa?",
                 "12x de R$19,90 pra vocês dois. Menos de R$10 por pessoa por mês!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Barato! Vou falar com minha esposa",
                 "Claro! Fico no aguardo. Qualquer dúvida me chama.",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("Ela topou! Bora fazer",
                 "Que ótimo! Aqui o link: [link]",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Feito o pagamento",
                 "Perfeito! Bem-vindos à família! Divirtam-se aprendendo juntos!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("Obrigado! Meu filho tá animado",
                 "Que delícia! Vai ser uma experiência incrível pra vocês!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    Scenario(
        id=5,
        name="Intermediário - Quer evoluir",
        description="Someone who plays a bit but wants to improve",
        category="happy_path",
        turns=[
            Turn("Olá, já toco violão há 2 anos mas sinto que estagnei",
                 "Olá! Entendo perfeitamente. Isso é super comum. O que você já sabe tocar?",
                 ExpectedResult(intent="greeting", skill_level="intermediate", interest_level="warm")),
            Turn("Sei acordes, algumas batidas, mas não consigo solar",
                 "Solos são um próximo passo natural. O curso tem técnicas específicas pra isso.",
                 ExpectedResult(intent="question", gates_set=["skill_identified"])),
            Turn("Queria aprender fingerstyle, tipo aqueles caras do YouTube",
                 "Fingerstyle é o módulo mais popular do curso! Você vai amar.",
                 ExpectedResult(intent="question", use_case="hobby", interest_level="warm", gates_set=["skill_identified", "need_identified"])),
            Turn("O curso serve pra quem já toca ou é só pra iniciante?",
                 "Serve pra todos os níveis! Tem módulos avançados que vão te desafiar.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Bom saber. Vi que tem muitos cursos por aí, por que esse?",
                 "O diferencial é o método do Rafael e o suporte. Mais de 50 mil alunos satisfeitos!",
                 ExpectedResult(intent="question", objection_type="trust", interest_level="warm")),
            Turn("Faz sentido. Posso ver uma aula de exemplo?",
                 "Claro! Te mando um link de aula grátis: [link]",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Assisti, gostei do jeito que ele ensina",
                 "Que bom! O curso inteiro é assim, didático e direto ao ponto.",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Ok, me convenceu. Qual o investimento?",
                 "12x de R$19,90 ou R$197 à vista. E garantia de 7 dias!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Fechado. Me manda o link",
                 "Aqui está: [link]. Bem-vindo ao próximo nível!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Comprei! Ansioso pras aulas de fingerstyle",
                 "Parabéns! Vai amar. Começa pelo módulo de técnica e depois vai pro fingerstyle!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    # =========================================================================
    # CATEGORY 2: OBJECTION HANDLING (6-10)
    # =========================================================================

    Scenario(
        id=6,
        name="Objeção - Não tenho dom",
        description="Classic 'I have no talent' objection",
        category="objection",
        turns=[
            Turn("oi vi o curso mas acho q n tenho jeito pra música",
                 "Oi! Por que você acha isso?",
                 ExpectedResult(intent="greeting", objection_type="talent", interest_level="cold")),
            Turn("Já tentei aprender outras coisas e nunca consigo",
                 "Entendo! Mas música é diferente. Com o método certo, qualquer um aprende.",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="cold", mode_after="objection_handling")),
            Turn("Será? Todo mundo da minha família é desafinado",
                 "Violão não precisa de afinação vocal! E ritmo se desenvolve com prática.",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="cold")),
            Turn("Hm mas eu sou muito desajeitado com as mãos",
                 "Coordenação motora melhora com exercícios. Temos alunos de todas as idades que conseguiram!",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="cold")),
            Turn("Sério? Até gente mais velha?",
                 "Sim! Temos alunos de 60, 70 anos aprendendo do zero. É só ter paciência.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Interessante... mas e se eu não conseguir mesmo?",
                 "Tem garantia de 7 dias. Se não funcionar pra você, devolvemos o dinheiro.",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="warm")),
            Turn("Isso me deixa mais tranquilo",
                 "Que bom! E você vai ver que consegue sim. O método é muito didático.",
                 ExpectedResult(intent="agreement", interest_level="warm", gates_set=["interest_confirmed"])),
            Turn("Tá, mas qual o valor?",
                 "12x de R$19,90. Menos de 70 centavos por dia!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Ok vou arriscar",
                 "Boa! Aqui o link: [link]. Vai dar certo!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("Feito!",
                 "Parabéns pela coragem! Você vai se surpreender. Bem-vindo!",
                 ExpectedResult(intent="purchased", gates_set=["interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=7,
        name="Objeção - Não tenho tempo",
        description="Busy person with time concerns",
        category="objection",
        turns=[
            Turn("Oi, trabalho muito e não sei se tenho tempo pra aprender violão",
                 "Oi! Entendo a correria. Quanto tempo livre você tem por dia?",
                 ExpectedResult(intent="greeting", objection_type="time", interest_level="warm")),
            Turn("Uns 15-20 minutos no máximo",
                 "Perfeito! As aulas são de 10-15 minutos. Dá pra encaixar!",
                 ExpectedResult(intent="objection", objection_type="time", interest_level="warm", mode_after="objection_handling")),
            Turn("Mas consegue aprender com tão pouco tempo?",
                 "Com certeza! Consistência é mais importante que quantidade. 15 min/dia é ótimo.",
                 ExpectedResult(intent="objection", objection_type="time", interest_level="warm")),
            Turn("E eu posso assistir a qualquer hora né?",
                 "Sim! 24h disponível. Assiste de madrugada, no almoço, quando quiser.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Isso é bom, meu horário é doido",
                 "Perfeito pra você então! Muitos alunos estudam assim.",
                 ExpectedResult(intent="agreement", interest_level="warm")),
            Turn("Nunca toquei nada, é muito difícil começar do zero?",
                 "Não! O curso é feito pra iniciantes. Passo a passo bem explicado.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("E dá pra aprender em quanto tempo?",
                 "Em 1-2 meses você já toca músicas simples. Em 6 meses, músicas completas.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Parece factível. Quero pra tocar em casa mesmo, relaxar",
                 "Ótimo objetivo! Violão é perfeito pra relaxar depois do trabalho.",
                 ExpectedResult(intent="agreement", use_case="hobby", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Vou fazer. Manda o link",
                 "Aqui está: [link]. Vai amar!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Pago!",
                 "Bem-vindo! Seus 15 minutos diários vão valer muito!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=8,
        name="Objeção - Muito caro",
        description="Price-sensitive customer",
        category="objection",
        turns=[
            Turn("quanto custa o curso",
                 "Oi! O investimento é de 12x de R$19,90. Posso te contar mais sobre o que está incluído?",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("nossa 200 reais é muito caro",
                 "Entendo! Mas pense assim: é menos de R$17 por mês, menos que uma aula presencial.",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="cold", mode_after="objection_handling")),
            Turn("mas aula presencial eu aprendo mais rápido",
                 "Na verdade não! Online você reassiste quantas vezes quiser, no seu ritmo.",
                 ExpectedResult(intent="objection", objection_type="method", interest_level="cold")),
            Turn("hm sei não",
                 "Você já toca alguma coisa ou seria do zero?",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("zero total",
                 "Então o curso é perfeito! Feito pra iniciantes.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("mas e se eu não gostar?",
                 "Tem garantia de 7 dias! Não gostou, dinheiro de volta.",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="warm")),
            Turn("isso é bom... mas ainda acho caro",
                 "Pensa assim: o acesso é vitalício. Uma vez pago, é seu pra sempre.",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="warm")),
            Turn("vitalício? sério?",
                 "Sim! E todas as atualizações futuras incluídas.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("aí muda de figura... quero pra tocar na igreja",
                 "Que lindo! Muitos alunos aprenderam pro louvor. Vale muito!",
                 ExpectedResult(intent="agreement", use_case="igreja", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("vou fazer então, me manda",
                 "Ótima decisão! Aqui: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
        ]
    ),

    Scenario(
        id=9,
        name="Objeção - Não tenho violão",
        description="Customer without instrument",
        category="objection",
        turns=[
            Turn("oi queria aprender violão mas não tenho um",
                 "Oi! Tudo bem, isso é comum. Você pretende comprar um?",
                 ExpectedResult(intent="greeting", objection_type="equipment", interest_level="warm")),
            Turn("não sei, violão é caro né",
                 "Tem violões bons a partir de R$200. Alguns alunos começam com emprestado.",
                 ExpectedResult(intent="objection", objection_type="equipment", interest_level="warm", mode_after="objection_handling")),
            Turn("meu vizinho tem um velho, será que serve?",
                 "Se estiver em condições de uso, serve sim! O importante é começar.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("vou perguntar pra ele",
                 "Boa! Enquanto isso, posso te contar sobre o curso?",
                 ExpectedResult(intent="other", interest_level="warm")),
            Turn("pode sim, sou iniciante total",
                 "Perfeito! O curso é feito pra quem nunca tocou. Passo a passo.",
                 ExpectedResult(intent="agreement", skill_level="zero", gates_set=["skill_identified"])),
            Turn("quero aprender pra tocar pros amigos",
                 "Que legal! Violão em roda de amigos é sempre sucesso!",
                 ExpectedResult(intent="other", use_case="hobby", gates_set=["skill_identified", "need_identified"])),
            Turn("meu vizinho disse que me empresta!",
                 "Oba! Problema resolvido então. Pronto pra começar?",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("sim! quanto é?",
                 "12x de R$19,90. E você pode começar hoje mesmo!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("fechou",
                 "Aqui o link: [link]. Boa sorte com o violão do vizinho!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("comprei! vou buscar o violão",
                 "Parabéns! Avisa quando começar as aulas. Bons estudos!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=10,
        name="Objeção - Muito velho",
        description="Age-related concerns",
        category="objection",
        turns=[
            Turn("Tenho 58 anos, será que ainda dá tempo de aprender?",
                 "Claro que dá! Idade não é barreira. Temos muitos alunos 60+!",
                 ExpectedResult(intent="greeting", objection_type="age", interest_level="warm")),
            Turn("Mas meus dedos são duros, artrite sabe",
                 "Entendo. Violão pode até ajudar a exercitar! Começando devagar.",
                 ExpectedResult(intent="objection", objection_type="age", interest_level="warm", mode_after="objection_handling")),
            Turn("Sério que ajuda?",
                 "Sim! Muitos relatam melhora na coordenação motora fina.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Nossa, não sabia. Nunca toquei nada na vida",
                 "Melhor ainda! Sem vícios pra corrigir. Começa certinho desde o início.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("Minha esposa diz que sou teimoso, que não vou aprender",
                 "Vai provar ela errada! Teimoso é bom, significa persistente!",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm")),
            Turn("Haha é verdade! Quero aprender pra animar a casa",
                 "Que lindo objetivo! Música em casa muda o ambiente.",
                 ExpectedResult(intent="agreement", use_case="hobby", interest_level="warm", gates_set=["skill_identified", "need_identified"])),
            Turn("O curso é fácil de acompanhar? Não sou bom com tecnologia",
                 "Super fácil! É só dar play nos vídeos. Nada complicado.",
                 ExpectedResult(intent="question", objection_type="method", interest_level="warm")),
            Turn("Ah bom! Então acho que vou tentar",
                 "Isso! Vai adorar. E sua esposa vai adorar te ouvir tocar.",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Quanto custa?",
                 "12x de R$19,90. Investimento pro resto da vida!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Pode mandar o link",
                 "Aqui está: [link]. Bem-vindo! Vai arrasar!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
        ]
    ),

    # =========================================================================
    # CATEGORY 3: EDGE CASES & WEIRD BEHAVIOR (11-15)
    # =========================================================================

    Scenario(
        id=11,
        name="Respostas de uma palavra",
        description="User giving minimal one-word answers",
        category="edge_case",
        turns=[
            Turn("oi", "Oi! Tudo bem? Vi que você se interessou pelo curso de violão!",
                 ExpectedResult(intent="greeting", interest_level="cold")),
            Turn("sim", "Legal! Você já toca alguma coisa?",
                 ExpectedResult(intent="agreement", interest_level="cold")),
            Turn("não", "Ah, então seria pra começar do zero. O que te motivou a querer aprender?",
                 ExpectedResult(intent="other", skill_level="zero", gates_set=["skill_identified"])),
            Turn("igreja", "Que lindo! Tocar na igreja é uma motivação especial!",
                 ExpectedResult(intent="other", use_case="igreja", gates_set=["skill_identified", "need_identified"])),
            Turn("é", "Muitos alunos nossos aprenderam pro louvor. Quer saber mais do curso?",
                 ExpectedResult(intent="agreement", interest_level="warm")),
            Turn("quero", "O curso tem mais de 100 aulas, do zero ao avançado. Interesse?",
                 ExpectedResult(intent="agreement", interest_level="warm")),
            Turn("talvez", "Posso te ajudar com alguma dúvida?",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("preço", "12x de R$19,90 ou R$197 à vista!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("ok", "Quer que eu te mande o link?",
                 ExpectedResult(intent="agreement", interest_level="warm", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("manda", "Aqui: [link]. Qualquer dúvida me chama!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
        ]
    ),

    Scenario(
        id=12,
        name="Muda de ideia várias vezes",
        description="Indecisive user changing mind",
        category="edge_case",
        turns=[
            Turn("Quero fazer o curso!",
                 "Oba! Que ótimo! Posso te mandar o link?",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Na verdade, deixa eu pensar melhor",
                 "Claro! Fico à disposição pra tirar dúvidas.",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("Tá, me manda o link",
                 "Aqui está: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Espera, é caro demais",
                 "Entendo! Mas são 12x de R$19,90. Menos de R$1 por dia!",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="warm", mode_after="objection_handling")),
            Turn("Hm verdade. Mas não tenho violão",
                 "Dá pra começar com um emprestado ou usado baratinho!",
                 ExpectedResult(intent="objection", objection_type="equipment", interest_level="warm")),
            Turn("Vou comprar um! Mas... será que aprendo?",
                 "Com certeza! Método comprovado por 50 mil alunos.",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm")),
            Turn("Tá bom, vou fazer",
                 "Ótimo! Te mando o link novamente: [link]",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["interest_confirmed"])),
            Turn("Não, calma. Vou esperar o mês que vem",
                 "Sem problemas! Me chama quando estiver pronto.",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("Ah, já que comecei, vou fazer logo",
                 "Essa é a atitude! Vai lá!",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["interest_confirmed"])),
            Turn("Paguei!",
                 "Finalmente! Haha. Bem-vindo! Vai adorar!",
                 ExpectedResult(intent="purchased", gates_set=["interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=13,
        name="Sai do assunto várias vezes",
        description="User going off-topic frequently",
        category="edge_case",
        turns=[
            Turn("Oi! Vi o curso de violão. Ei, você é humano ou robô?",
                 "Oi! Sou a Nina, assistente do Rafael. Posso te ajudar com o curso!",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Ah legal. Tá chovendo aqui. Você gosta de chuva?",
                 "Adoro! Haha. E aí, você já toca violão?",
                 ExpectedResult(intent="other", interest_level="cold")),
            Turn("Não, nunca toquei. Aliás, você viu o jogo ontem?",
                 "Não vi! Mas voltando pro violão - o que te motivou a querer aprender?",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("Quero impressionar uma mina. Brincadeira, quero pro hobby mesmo",
                 "Haha! Hobby é ótimo motivo! Violão relaxa muito.",
                 ExpectedResult(intent="other", use_case="hobby", gates_set=["skill_identified", "need_identified"])),
            Turn("É né. Ei, quanto você ganha pra fazer isso?",
                 "Haha, segredo! Mas o curso custa só 12x de R$19,90. Interesse?",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Barato. Mas e aí, o Rafael é gente boa?",
                 "Super! Muito didático e acessível. Os alunos adoram.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Legal. Ah, minha mãe tá chamando. Já volto",
                 "Ok! Fico aqui.",
                 ExpectedResult(intent="other", interest_level="warm")),
            Turn("Voltei. Tava comendo. O que a gente tava falando?",
                 "Sobre o curso! Você parecia interessado. Quer o link?",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Quero sim! Vai que eu viro famoso né",
                 "Vai que vai! Aqui o link: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"], mode_after="fechamento")),
            Turn("Comprei! Agora vou voltar pro jogo. Valeu!",
                 "Haha! Parabéns e bom jogo! Bons estudos depois!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=14,
        name="Quer falar com humano",
        description="User requesting human support",
        category="edge_case",
        turns=[
            Turn("Oi, tem alguém de verdade aí?",
                 "Oi! Sou a Nina, assistente virtual. Posso te ajudar com o curso de violão!",
                 ExpectedResult(intent="request_human", interest_level="cold")),
            Turn("Não quero falar com robô",
                 "Entendo! Posso encaminhar pra equipe humana. Mas posso tentar te ajudar primeiro?",
                 ExpectedResult(intent="request_human", interest_level="cold")),
            Turn("Tá, mas se eu não gostar chamo alguém",
                 "Combinado! O que você gostaria de saber sobre o curso?",
                 ExpectedResult(intent="agreement", interest_level="warm")),
            Turn("Quero saber se funciona mesmo",
                 "Funciona sim! Mais de 50 mil alunos já aprenderam.",
                 ExpectedResult(intent="question", objection_type="method", interest_level="warm")),
            Turn("Mas eu nunca toquei nada",
                 "Perfeito! O curso é justamente pra iniciantes.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("E se eu não aprender?",
                 "Tem garantia de 7 dias. Se não gostar, dinheiro de volta.",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="warm")),
            Turn("Hmm ok. Quero pra tocar em casa",
                 "Ótimo! Violão é perfeito pra relaxar em casa.",
                 ExpectedResult(intent="agreement", use_case="hobby", gates_set=["skill_identified", "need_identified"])),
            Turn("Quanto custa?",
                 "12x de R$19,90 ou R$197 à vista.",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Vou querer. Você até que é legal pra um robô",
                 "Haha! Obrigada! Aqui o link: [link]",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Feito! Agora não preciso do humano",
                 "Que bom que pude ajudar! Bem-vindo ao curso!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=15,
        name="Compara com concorrentes",
        description="User comparing with other courses",
        category="edge_case",
        turns=[
            Turn("Vi vários cursos de violão online. Por que esse é diferente?",
                 "Ótima pergunta! O diferencial é o método do Rafael e o suporte completo.",
                 ExpectedResult(intent="question", objection_type="trust", interest_level="warm")),
            Turn("Tem um no YouTube de graça",
                 "YouTube é ótimo pra complementar, mas não tem estrutura nem suporte.",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="warm")),
            Turn("E o curso do fulano que é 97 reais?",
                 "Cada curso tem sua proposta. O nosso tem acesso vitalício e 100+ aulas.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Vocês tem quantas aulas?",
                 "Mais de 100 aulas, do zero ao fingerstyle avançado!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("E suporte? Se eu tiver dúvida?",
                 "Temos grupo exclusivo de alunos e suporte por email.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Interessante. Eu sou iniciante total",
                 "Perfeito! O curso começa do zero mesmo. Passo a passo.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("Quero aprender pro meu trampo, sou professor de música mas só de teoria",
                 "Que legal! Vai complementar muito seu conhecimento prático!",
                 ExpectedResult(intent="other", use_case="profissional", gates_set=["skill_identified", "need_identified"])),
            Turn("Convencido. Esse parece o mais completo",
                 "Que bom! Você vai adorar. Quer o link?",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Manda",
                 "Aqui: [link]. 12x de R$19,90!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Pago!",
                 "Excelente escolha! Bem-vindo, professor! Vai arrasar!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    # =========================================================================
    # CATEGORY 4: INFORMAL/TYPOS/AUDIO STYLE (16-20)
    # =========================================================================

    Scenario(
        id=16,
        name="Cheio de erros de digitação",
        description="User with lots of typos",
        category="informal",
        turns=[
            Turn("oii td bm?? vi o krso de violao",
                 "Oi! Tudo bem sim! Que bom que viu o curso!",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("eh mto caro ne",
                 "São 12x de R$19,90! Menos de R$1 por dia.",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="warm", mode_after="objection_handling")),
            Turn("hmmm n sei se vale a pena",
                 "Você já toca alguma coisa ou seria do zero?",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("zero msm, nunka toquei nd",
                 "Então é perfeito pra você! Feito pra iniciantes.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("qro pra toca na igrega",
                 "Que lindo! Muitos alunos aprenderam pro louvor!",
                 ExpectedResult(intent="other", use_case="igreja", gates_set=["skill_identified", "need_identified"])),
            Turn("sera q eu consgio aprender??",
                 "Com certeza! O método é bem didático. Qualquer um aprende!",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm")),
            Turn("blz vou pensa",
                 "Ok! Qualquer dúvida me chama!",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("pensei aki, bora faze",
                 "Oba! Te mando o link: [link]",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("qnt era msm?",
                 "12x de R$19,90 ou R$197 à vista!",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("feitu comprei",
                 "Parabéns! Bem-vindo ao curso! Bons estudos!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=17,
        name="Estilo áudio transcrito",
        description="Messages that sound like transcribed voice",
        category="informal",
        turns=[
            Turn("oi tudo bem eu vi lá o curso de violão aí eu queria saber mais né porque eu tenho vontade de aprender",
                 "Oi! Que legal! Você já toca alguma coisa?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("não cara nunca toquei nada sou muito ruim com música mas sempre quis aprender sabe",
                 "Entendo! O curso é perfeito pra iniciantes então!",
                 ExpectedResult(intent="question", skill_level="zero", objection_type="talent", gates_set=["skill_identified"])),
            Turn("é que tipo assim eu quero aprender pra poder tocar lá na igreja que eu vou todo domingo e tal",
                 "Que lindo objetivo! Muitos alunos nossos aprenderam pro louvor!",
                 ExpectedResult(intent="other", use_case="igreja", gates_set=["skill_identified", "need_identified"])),
            Turn("aí eu fico pensando será que eu consigo né porque minha mão é meio dura assim",
                 "Relaxa! Coordenação melhora com prática. Todos os alunos passaram por isso!",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm", mode_after="objection_handling")),
            Turn("ah bom então tá né e tipo quanto que custa isso aí eu preciso saber pra ver se cabe no orçamento",
                 "12x de R$19,90 ou R$197 à vista. Cabe no bolso!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("nossa que barato pensei que era mais caro assim tipo uns 500 reais",
                 "Que nada! E o acesso é vitalício!",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("sério vitalício assim pra sempre mesmo eu pago uma vez e pronto",
                 "Isso mesmo! Uma vez só e é seu pra sempre.",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("nossa muito bom viu eu vou fazer sim me manda o link aí por favor",
                 "Aqui está: [link]. Vai adorar!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("tá comprando aqui ó tô colocando o cartão",
                 "Boa! Qualquer problema me avisa!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("deu certo obrigado viu deus abençoe",
                 "Parabéns! Que Deus te abençoe também! Bons estudos!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=18,
        name="Usa muitos emojis",
        description="User who loves emojis",
        category="informal",
        turns=[
            Turn("Oiii 😍😍 vi o curso de violão 🎸🎸🎸",
                 "Oi! Que bom! Você já toca?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Não 😭😭 mas quero muito aprender 🙏🙏",
                 "Ahhh! Então o curso é perfeito pra você!",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("Sério?? 😱 Sempre achei que não tinha jeito pra música 😢",
                 "Todo mundo pode aprender! É só praticar!",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm", mode_after="objection_handling")),
            Turn("Ai que bom 🥰 quero aprender pra cantar em casa mesmo 🏠🎵",
                 "Que lindo! Violão em casa é muito gostoso!",
                 ExpectedResult(intent="agreement", use_case="hobby", interest_level="warm", gates_set=["skill_identified", "need_identified"])),
            Turn("Quanto custa?? 💰💰",
                 "12x de R$19,90! Bem acessível!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Nossa que barato 😍😍😍",
                 "Né?! E o acesso é vitalício!",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("QUERO 🙋‍♀️🙋‍♀️",
                 "Oba! Aqui o link: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Vou comprar agora 💳",
                 "Vai lá!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("COMPREI 🎉🎉🎉🎉",
                 "PARABÉNS! 🎸 Bem-vinda!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("Obrigadaaa 😘😘😘 vou começar hoje",
                 "Vai arrasar! 🎸✨",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    Scenario(
        id=19,
        name="Gírias e linguagem jovem",
        description="Young person using lots of slang",
        category="informal",
        turns=[
            Turn("eae mano, esse curso é brabo msm?",
                 "Eae! É brabo demais! O Rafael manja muito!",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("show, tô querendo aprender pra fzr um som pros parça",
                 "Massa! Tocar pros amigos é muito daora!",
                 ExpectedResult(intent="other", use_case="hobby", interest_level="warm")),
            Turn("só q tipo, nunca encostei num violão tlgd",
                 "Suave! O curso é pro zero ao avançado.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified", "need_identified"])),
            Turn("bom d+ então. quanto tá custando essa bagaça?",
                 "12x de 19,90, mó suave!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("hmm tá caro n?",
                 "Que isso! É menos que um lanche por semana!",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="warm", mode_after="objection_handling")),
            Turn("faz sentido kkkk",
                 "Né?! E o acesso é pra sempre!",
                 ExpectedResult(intent="agreement", interest_level="warm", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("pera aí vou pedi pro meu véio pagar kkk",
                 "Boa! Vai lá!",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("ele topou, manda o link ae",
                 "Aqui mano: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("fechou, comprei",
                 "Boa mano! Agora é só mandar ver!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("vlw tmj 🤙",
                 "Tmj! Bora dominar o violão!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    Scenario(
        id=20,
        name="Mensagens muito longas",
        description="User who sends walls of text",
        category="informal",
        turns=[
            Turn("Oi, tudo bem? Então, deixa eu me apresentar: meu nome é Carlos, tenho 35 anos, trabalho como contador há 10 anos e sempre quis aprender a tocar um instrumento musical. Quando era criança tentei aprender piano mas não deu certo, aí desisti. Agora vi esse curso de violão e fiquei interessado porque sempre achei violão um instrumento muito bonito e versátil, dá pra tocar vários estilos de música né. O que você acha, vale a pena pra mim?",
                 "Oi Carlos! Prazer! Vale muito a pena sim! Violão é incrível!",
                 ExpectedResult(intent="greeting", customer_name="Carlos", skill_level="zero", interest_level="warm", gates_set=["name_captured", "skill_identified"])),
            Turn("Que bom! É que eu fico meio inseguro porque como eu disse tentei piano e não consegui, aí fico pensando se com violão vai ser diferente ou se vou desistir de novo como sempre acontece comigo, porque eu tenho esse problema de começar as coisas e não terminar, minha esposa vive reclamando disso inclusive",
                 "Entendo Carlos! Mas violão com método certo é diferente! As aulas são curtas pra manter o foco.",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm", mode_after="objection_handling")),
            Turn("Isso é bom porque eu realmente não tenho muito tempo livre, trabalho das 8 às 18 e quando chego em casa estou cansado, mas gostaria de ter um hobby pra relaxar e a minha esposa também acha que eu preciso de algo assim, ela até falou que se eu aprender ela pode cantar junto porque ela gosta de cantar",
                 "Perfeito! Violão é ótimo pra relaxar! E tocar com a esposa cantando é lindo!",
                 ExpectedResult(intent="other", use_case="hobby", interest_level="warm", gates_set=["name_captured", "skill_identified", "need_identified"])),
            Turn("É verdade! Quanto custa?",
                 "12x de R$19,90 Carlos!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Nossa, achei que era mais caro, pelo tanto de conteúdo que vocês falam que tem. Deixa eu ver se entendi: eu pago isso e tenho acesso pra sempre a todas as aulas, é isso mesmo? E se tiver atualização também?",
                 "Isso mesmo! Vitalício e com todas atualizações futuras!",
                 ExpectedResult(intent="question", interest_level="hot", gates_set=["name_captured", "skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Perfeito!",
                 "Quer o link?",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("Quero sim por favor",
                 "Aqui Carlos: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Vou comprar agora",
                 "Boa!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Feito! Estou muito animado pra começar, já vou baixar o app e criar meu login. Obrigado pela paciência de explicar tudo, fez diferença!",
                 "Parabéns Carlos! Vai adorar! Qualquer dúvida estou aqui!",
                 ExpectedResult(intent="purchased", gates_set=["name_captured", "skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("Obrigado!",
                 "De nada! Bons estudos!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    # =========================================================================
    # CATEGORY 5: NUANCED/AMBIGUOUS (21-25)
    # =========================================================================

    Scenario(
        id=21,
        name="Interesse não claro",
        description="User whose interest level is hard to read",
        category="nuanced",
        turns=[
            Turn("hm", "Oi! Posso te ajudar?",
                 ExpectedResult(intent="other", interest_level="cold")),
            Turn("tô vendo aí", "Vendo o curso de violão? Legal! Você toca?",
                 ExpectedResult(intent="other", interest_level="cold")),
            Turn("mais ou menos", "Sabe o básico então?",
                 ExpectedResult(intent="other", skill_level="beginner", gates_set=["skill_identified"])),
            Turn("sei lá", "Haha! Quer melhorar?",
                 ExpectedResult(intent="other", interest_level="cold")),
            Turn("talvez", "O curso ajuda desde iniciantes até avançados!",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("hm tá", "Alguma dúvida que eu possa ajudar?",
                 ExpectedResult(intent="other", interest_level="cold")),
            Turn("quanto é", "12x de R$19,90!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("caro", "Tem garantia de 7 dias se não gostar!",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="cold", mode_after="objection_handling")),
            Turn("vou ver", "Ok! Me chama se tiver dúvidas!",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("fechado", "Opa! Quer o link?",
                 ExpectedResult(intent="agreement", interest_level="warm", gates_set=["skill_identified", "interest_confirmed"])),
        ]
    ),

    Scenario(
        id=22,
        name="Múltiplas intenções por mensagem",
        description="User expressing multiple things at once",
        category="nuanced",
        turns=[
            Turn("Oi! Quero saber do curso mas também quero saber se é confiável porque já caí em golpe",
                 "Oi! Entendo a preocupação! O curso é do Rafael, mais de 50 mil alunos!",
                 ExpectedResult(intent="greeting", objection_type="trust", interest_level="warm")),
            Turn("Ok, nunca toquei violão mas acho que não tenho jeito, será que funciona pra mim?",
                 "Funciona sim! O método é pra iniciantes, bem didático!",
                 ExpectedResult(intent="objection", objection_type="talent", skill_level="zero", gates_set=["skill_identified"], mode_after="objection_handling")),
            Turn("Interessante, quero pra igreja mas não tenho muito tempo, dá pra aprender rápido?",
                 "Dá! Com 15-20min/dia você já evolui. E pra igreja o básico já funciona!",
                 ExpectedResult(intent="question", use_case="igreja", objection_type="time", gates_set=["skill_identified", "need_identified"])),
            Turn("Bom saber! Quanto custa e como funciona o pagamento?",
                 "12x de R$19,90 no cartão, ou PIX à vista com desconto!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Aceita PIX? Prefiro porque meu cartão tá estourado mas tenho o dinheiro",
                 "Aceita sim! Fica R$197 no PIX.",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("Ótimo! Mas se eu não gostar posso cancelar? E o suporte funciona mesmo?",
                 "7 dias de garantia e suporte ativo! Pode confiar!",
                 ExpectedResult(intent="question", objection_type="trust", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Perfeito, vou fazer! Me manda o link do PIX e já me explica como acesso",
                 "Aqui o link: [link]. Após pagar, o acesso vai pro seu email!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Pagando aqui...",
                 "Boa!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("Pago! Recebi o email, obrigado por tirar todas as dúvidas!",
                 "Eu que agradeço! Bem-vindo! Vai arrasar na igreja!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
            Turn("Amém! Até mais!",
                 "Até! Deus abençoe!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
        ]
    ),

    Scenario(
        id=23,
        name="Sarcasmo e ironia",
        description="User being sarcastic/ironic",
        category="nuanced",
        turns=[
            Turn("Nossa, mais um curso online milagroso né",
                 "Haha! Entendo a desconfiança! Mas esse realmente funciona.",
                 ExpectedResult(intent="greeting", objection_type="trust", interest_level="cold")),
            Turn("Claro, todos dizem isso",
                 "Posso te mostrar depoimentos de alunos reais!",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="cold", mode_after="objection_handling")),
            Turn("Depoimento comprado qualquer um faz",
                 "Verdade, mas temos 50 mil alunos. Difícil fingir isso!",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="cold")),
            Turn("Hm, 50 mil... se for verdade até impressiona",
                 "É verdade! Pode verificar as avaliações online.",
                 ExpectedResult(intent="other", interest_level="warm")),
            Turn("Tá, vou dar uma chance. Sou iniciante completo",
                 "Ótimo! O curso é feito pra iniciantes.",
                 ExpectedResult(intent="agreement", skill_level="zero", interest_level="warm", gates_set=["skill_identified"])),
            Turn("'Feito pra iniciantes' é o que todos dizem também",
                 "Haha! Mas esse é de verdade. Posso te mandar uma aula grátis pra ver.",
                 ExpectedResult(intent="objection", objection_type="method", interest_level="warm")),
            Turn("Aí sim, manda",
                 "Aqui: [link da aula]. Assiste e me diz o que achou!",
                 ExpectedResult(intent="agreement", interest_level="warm")),
            Turn("... ok, confesso que é bom. Quero pra tocar em casa",
                 "Haha! Sabia que ia gostar! Violão em casa é demais.",
                 ExpectedResult(intent="agreement", use_case="hobby", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Tá quanto custa esse milagre?",
                 "12x de R$19,90 haha. Milagre barato!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Fechado, ganharam um cético",
                 "Oba! Aqui: [link]. Vai adorar, prometo!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
        ]
    ),

    Scenario(
        id=24,
        name="Fala de terceiros",
        description="User asking for someone else",
        category="nuanced",
        turns=[
            Turn("Oi, é pra minha filha de 15 anos",
                 "Oi! Que legal! Ela já toca alguma coisa?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Não, ela nunca pegou num violão",
                 "Perfeito pra começar do zero então!",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("Ela quer aprender pra tocar as músicas que ela gosta",
                 "Que lindo! O curso ensina a tocar qualquer música!",
                 ExpectedResult(intent="other", use_case="hobby", gates_set=["skill_identified", "need_identified"])),
            Turn("Ela é meio desistente, será que vai funcionar?",
                 "O curso tem aulas curtas e músicas atuais! Mantém o interesse!",
                 ExpectedResult(intent="objection", objection_type="method", interest_level="warm", mode_after="objection_handling")),
            Turn("Interessante. Deixa eu perguntar pra ela. FILHA VEM CÁ",
                 "Haha! Vai lá!",
                 ExpectedResult(intent="other", interest_level="warm")),
            Turn("Oi sou a filha, minha mãe falou do curso, parece legal",
                 "Oi! Seja bem-vinda! Quer saber mais?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Sim! Tem aulas de música pop?",
                 "Tem sim! O método ensina cifras pra tocar qualquer música!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Mãe, eu quero! MÃE COMPRA PRA MIM",
                 "Haha! Convenceu ela!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"], mode_after="fechamento")),
            Turn("Ok ok, quanto custa? (sou a mãe de volta)",
                 "12x de R$19,90! Investimento na educação dela!",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("Fechado, minha filha me convenceu. Manda o link",
                 "Aqui: [link]. Ela vai adorar! Parabéns pela decisão!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
        ]
    ),

    Scenario(
        id=25,
        name="Confuso sobre o que quer",
        description="User who seems confused",
        category="nuanced",
        turns=[
            Turn("Oi é curso de violão ou guitarra?",
                 "Oi! É de violão! Mas as técnicas ajudam na guitarra também.",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("Ah tá. Eu queria guitarra na verdade. Ou violão, sei lá",
                 "O ideal é começar pelo violão! Base mais sólida.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Faz sentido. Mas eu não sei se quero aprender mesmo",
                 "O que te fez procurar o curso?",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("Meus amigos tocam e eu fico de fora",
                 "Ah! Então você quer participar das rodas de música!",
                 ExpectedResult(intent="other", use_case="hobby", interest_level="warm")),
            Turn("É, mais ou menos. Mas acho difícil",
                 "Você já tentou aprender antes?",
                 ExpectedResult(intent="objection", objection_type="talent", interest_level="warm", mode_after="objection_handling")),
            Turn("Nunca. Mas parece difícil",
                 "É mais fácil do que parece! Com método certo, qualquer um aprende.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified", "need_identified"])),
            Turn("Hm sei não. Quanto custa?",
                 "12x de R$19,90. E tem garantia de 7 dias!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("Barato. Mas e se eu desistir?",
                 "Se desistir em 7 dias, dinheiro de volta!",
                 ExpectedResult(intent="objection", objection_type="trust", interest_level="warm")),
            Turn("Aí tá justo. Tá, vou tentar",
                 "Boa! Aqui o link: [link]. Vai ver que consegue!",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("Feito. Agora vou descobrir se sirvo pra isso",
                 "Serve sim! Bem-vindo! Bons estudos!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    # =========================================================================
    # CATEGORY 6: FAST/SLOW CONVERTERS (26-30)
    # =========================================================================

    Scenario(
        id=26,
        name="Comprador impulsivo",
        description="User who buys immediately",
        category="converter",
        turns=[
            Turn("Oi! Quero comprar o curso! Manda o link!",
                 "Oi! Oba! Aqui está: [link]",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("Feito! Paguei!",
                 "Uau, rápido! Bem-vindo! Seu acesso já está disponível!",
                 ExpectedResult(intent="purchased", gates_set=["purchased"])),
            Turn("Valeu! Vou começar agora!",
                 "Isso! Qualquer dúvida me chama!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("Por onde começo?",
                 "Módulo 1, Aula 1! Bem básico e vai progredindo.",
                 ExpectedResult(intent="question", interest_level="hot")),
            Turn("Blz!",
                 "Bons estudos!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("Tô gostando!",
                 "Que bom! Continua assim!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("Obrigado!",
                 "Eu que agradeço!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("👍",
                 "🎸",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("Até!",
                 "Até! Bons estudos!",
                 ExpectedResult(intent="agreement", interest_level="hot")),
            Turn("",
                 "",
                 ExpectedResult(intent="other", interest_level="hot")),
        ]
    ),

    Scenario(
        id=27,
        name="Leva muito tempo pra decidir",
        description="User who takes many turns to decide",
        category="converter",
        turns=[
            Turn("oi, to pensando em fazer o curso",
                 "Oi! Que legal! Posso te ajudar a decidir?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("sim, quero saber tudo antes de decidir",
                 "Claro! O que você gostaria de saber?",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("primeiro, quantas aulas tem?",
                 "Mais de 100 aulas, do básico ao avançado!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("e qual a duração média das aulas?",
                 "Entre 10 e 20 minutos cada.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("posso baixar pra ver offline?",
                 "Sim! Tem app com download.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("e se eu tiver dúvida durante o curso?",
                 "Tem suporte por email e grupo de alunos!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("o certificado é reconhecido?",
                 "Sim! Certificado de conclusão incluso.",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("nunca toquei violão, serve pra mim?",
                 "Serve sim! Feito pra iniciantes!",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified"])),
            Turn("quero aprender pro meu hobby",
                 "Ótimo objetivo! Violão é perfeito pra relaxar.",
                 ExpectedResult(intent="other", use_case="hobby", gates_set=["skill_identified", "need_identified"])),
            Turn("ok, acho que vou fazer. manda o link",
                 "Finalmente! Haha. Aqui: [link]. 12x de R$19,90!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", gates_set=["skill_identified", "need_identified", "interest_confirmed"], mode_after="fechamento")),
        ]
    ),

    Scenario(
        id=28,
        name="Volta depois de dias",
        description="User who comes back after going away",
        category="converter",
        turns=[
            Turn("oi vi o curso",
                 "Oi! Quer saber mais?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("sim mas agora não posso, depois falo",
                 "Ok! Fico aqui quando precisar!",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("voltei! desculpa a demora",
                 "Oi! Sem problemas! Ainda interessado no curso?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("sim! tava juntando dinheiro",
                 "Que ótimo! Pronto pra começar?",
                 ExpectedResult(intent="agreement", interest_level="hot", gates_set=["interest_confirmed"])),
            Turn("quase! me conta de novo sobre o curso?",
                 "Claro! São mais de 100 aulas, do zero ao fingerstyle!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("nunca toquei nada",
                 "Perfeito! O curso é pra iniciantes.",
                 ExpectedResult(intent="question", skill_level="zero", gates_set=["skill_identified", "interest_confirmed"])),
            Turn("quero pra tocar na igreja",
                 "Que lindo! Muitos alunos aprenderam pro louvor!",
                 ExpectedResult(intent="other", use_case="igreja", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("quanto era mesmo?",
                 "12x de R$19,90 ou R$197 à vista!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("vou pagar à vista, manda pix",
                 "Aqui o link: [link]. PIX sai R$197!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("pago! finalmente consegui!",
                 "Parabéns! Valeu a espera! Bem-vindo!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=29,
        name="Desiste mas volta",
        description="User who gives up then comes back",
        category="converter",
        turns=[
            Turn("não quero mais o curso, obrigado",
                 "Ok! Se mudar de ideia, estou aqui!",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("é que tá caro pra mim agora",
                 "Entendo! São 12x de R$19,90, mas entendo se não cabe agora.",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="cold", mode_after="objection_handling")),
            Turn("é, infelizmente",
                 "Sem problemas! Boa sorte!",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("ei, recebi uma grana extra aqui",
                 "Oba! Quer reconsiderar?",
                 ExpectedResult(intent="other", interest_level="warm")),
            Turn("sim! ainda tá 197?",
                 "Isso! Ou 12x de R$19,90!",
                 ExpectedResult(intent="question", interest_level="hot", gates_set=["interest_confirmed"])),
            Turn("quero! nunca toquei violão",
                 "Ótimo! O curso é perfeito pra iniciantes!",
                 ExpectedResult(intent="agreement", skill_level="zero", interest_level="hot", gates_set=["skill_identified", "interest_confirmed"])),
            Turn("quero aprender pro hobby mesmo",
                 "Excelente objetivo!",
                 ExpectedResult(intent="other", use_case="hobby", gates_set=["skill_identified", "need_identified", "interest_confirmed"])),
            Turn("manda o link",
                 "Aqui: [link]!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot", mode_after="fechamento")),
            Turn("comprando...",
                 "Vai lá!",
                 ExpectedResult(intent="ready_to_buy", interest_level="hot")),
            Turn("feito! dessa vez foi!",
                 "Que bom que voltou! Bem-vindo!",
                 ExpectedResult(intent="purchased", gates_set=["skill_identified", "need_identified", "interest_confirmed", "purchased"])),
        ]
    ),

    Scenario(
        id=30,
        name="Nunca converte",
        description="User who never buys despite interest",
        category="converter",
        turns=[
            Turn("oi quero saber do curso",
                 "Oi! Claro! O que quer saber?",
                 ExpectedResult(intent="greeting", interest_level="warm")),
            Turn("parece bom, quanto custa?",
                 "12x de R$19,90!",
                 ExpectedResult(intent="question", interest_level="warm")),
            Turn("hm vou pensar",
                 "Ok! Qualquer dúvida me chama!",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("ainda to pensando",
                 "Sem pressa! Posso ajudar com alguma dúvida?",
                 ExpectedResult(intent="not_ready", interest_level="warm")),
            Turn("é que tô sem grana agora",
                 "Entendo! São só R$19,90 por mês se preferir parcelar.",
                 ExpectedResult(intent="objection", objection_type="money", interest_level="warm", mode_after="objection_handling")),
            Turn("mesmo assim, deixa pra depois",
                 "Ok! Fico aqui quando precisar.",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("mês que vem eu vejo",
                 "Combinado! Boa sorte até lá!",
                 ExpectedResult(intent="not_ready", interest_level="cold")),
            Turn("obrigado pela paciência",
                 "Imagina! Estou aqui se precisar!",
                 ExpectedResult(intent="agreement", interest_level="cold")),
            Turn("até",
                 "Até! Sucesso!",
                 ExpectedResult(intent="other", interest_level="cold")),
            Turn("👋",
                 "👋🎸",
                 ExpectedResult(intent="other", interest_level="cold")),
        ]
    ),
]


# =============================================================================
# TEST RUNNER
# =============================================================================

def run_scenario(scenario: Scenario, verbose: bool = True) -> dict:
    """Run a single scenario and return results."""
    if verbose:
        print(f"\n{'='*70}")
        print(f"SCENARIO {scenario.id}: {scenario.name}")
        print(f"Category: {scenario.category}")
        print(f"Description: {scenario.description}")
        print(f"{'='*70}")

    state = create_nina_initial_state()
    history = []
    results = {
        "scenario_id": scenario.id,
        "name": scenario.name,
        "turns": [],
        "passed": 0,
        "failed": 0,
        "total": 0,
    }

    for i, turn in enumerate(scenario.turns):
        if not turn.user_message:  # Skip empty turns
            continue

        results["total"] += 1

        if verbose:
            print(f"\n--- Turn {i+1} ---")
            print(f"User: {turn.user_message[:80]}{'...' if len(turn.user_message) > 80 else ''}")

        # Run extraction
        result = extract(NINA_CONFIG, state, turn.user_message, history=history)

        # Check expected results
        turn_result = {
            "turn": i + 1,
            "message": turn.user_message[:50],
            "checks": [],
            "passed": True
        }

        expected = turn.expected

        # Check intent
        if expected.intent:
            actual = result.signals.get("intent")
            match = actual == expected.intent
            turn_result["checks"].append(f"intent: {actual} {'✓' if match else f'✗ (expected {expected.intent})'}")
            if not match:
                turn_result["passed"] = False

        # Check objection_type
        if expected.objection_type:
            actual = result.signals.get("objection_type")
            match = actual == expected.objection_type
            turn_result["checks"].append(f"objection: {actual} {'✓' if match else f'✗ (expected {expected.objection_type})'}")
            if not match:
                turn_result["passed"] = False

        # Check interest_level
        if expected.interest_level:
            actual = result.signals.get("interest_level")
            match = actual == expected.interest_level
            turn_result["checks"].append(f"interest: {actual} {'✓' if match else f'✗ (expected {expected.interest_level})'}")
            if not match:
                turn_result["passed"] = False

        # Check skill_level trait
        if expected.skill_level:
            actual = result.trait_updates.get("skill_level")
            match = actual == expected.skill_level
            turn_result["checks"].append(f"skill: {actual} {'✓' if match else f'✗ (expected {expected.skill_level})'}")
            if not match:
                turn_result["passed"] = False

        # Check use_case trait
        if expected.use_case:
            actual = result.trait_updates.get("use_case")
            match = actual == expected.use_case
            turn_result["checks"].append(f"use_case: {actual} {'✓' if match else f'✗ (expected {expected.use_case})'}")
            if not match:
                turn_result["passed"] = False

        # Check customer_name trait
        if expected.customer_name:
            actual = result.trait_updates.get("customer_name")
            match = actual is not None and expected.customer_name.lower() in actual.lower()
            turn_result["checks"].append(f"name: {actual} {'✓' if match else f'✗ (expected {expected.customer_name})'}")
            if not match:
                turn_result["passed"] = False

        # Check mode_after
        if expected.mode_after:
            actual = result.mode_shift
            match = actual == expected.mode_after
            turn_result["checks"].append(f"mode_shift: {actual} {'✓' if match else f'✗ (expected {expected.mode_after})'}")
            if not match:
                turn_result["passed"] = False

        if verbose:
            for check in turn_result["checks"]:
                print(f"  {check}")

        if turn_result["passed"]:
            results["passed"] += 1
        else:
            results["failed"] += 1

        results["turns"].append(turn_result)

        # Update state for next turn
        state = RuntimeState(
            gates={**state.gates, **result.gate_updates},
            traits={**state.traits, **{k: v for k, v in result.trait_updates.items() if v}},
            mode=result.mode_shift or state.mode,
            signals=result.signals,
            last_message=turn.user_message,
            turn_count=state.turn_count + 1
        )

        # Update history
        history.append({"role": "user", "content": turn.user_message})
        history.append({"role": "assistant", "content": turn.assistant_response})

    if verbose:
        print(f"\n--- Scenario Result ---")
        print(f"Passed: {results['passed']}/{results['total']}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Nina Extraction Stress Test")
    parser.add_argument("--scenario", type=int, help="Run specific scenario by ID")
    parser.add_argument("--category", type=str, help="Run scenarios in category")
    parser.add_argument("--summary", action="store_true", help="Show summary only")
    parser.add_argument("--quick", action="store_true", help="Run first 3 scenarios only")
    args = parser.parse_args()

    scenarios_to_run = SCENARIOS

    if args.scenario:
        scenarios_to_run = [s for s in SCENARIOS if s.id == args.scenario]
        if not scenarios_to_run:
            print(f"Scenario {args.scenario} not found!")
            return

    if args.category:
        scenarios_to_run = [s for s in SCENARIOS if s.category == args.category]
        if not scenarios_to_run:
            print(f"Category '{args.category}' not found!")
            print(f"Available: happy_path, objection, edge_case, informal, nuanced, converter")
            return

    if args.quick:
        scenarios_to_run = scenarios_to_run[:3]

    print("=" * 70)
    print("NINA EXTRACTION STRESS TEST")
    print(f"Running {len(scenarios_to_run)} scenarios")
    print("=" * 70)

    all_results = []
    total_passed = 0
    total_failed = 0
    total_checks = 0

    for scenario in scenarios_to_run:
        result = run_scenario(scenario, verbose=not args.summary)
        all_results.append(result)
        total_passed += result["passed"]
        total_failed += result["failed"]
        total_checks += result["total"]

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    for result in all_results:
        status = "✓" if result["failed"] == 0 else "✗"
        print(f"{status} Scenario {result['scenario_id']:2d}: {result['name'][:40]:40s} {result['passed']}/{result['total']}")

    print("-" * 70)
    print(f"TOTAL: {total_passed}/{total_checks} checks passed ({total_passed/total_checks*100:.1f}%)")
    print(f"Failed: {total_failed}")


if __name__ == "__main__":
    main()
