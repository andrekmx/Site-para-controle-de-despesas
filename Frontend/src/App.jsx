import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  

  function salvar(e) {
    if(e) e.preventDefault();
    const input = document.getElementById("input").value;

    localStorage.setItem("nome", input);

    alert("Texto salvo no navegador");
   

  }

  return (
    <div className="fundo" >
      <div className="topo"> 
      <h1 className="titulo">Livro de contas</h1>
      <p>Registre gastos divididos e veja, a qualquer momento, quem deve o quê pra quem.</p>
      </div>
      <div className="divisor"></div>
      <div className="conteudo">
      <div className="pessoas"
      style={{
  display: "grid",
  gridTemplateColumns: "1fr 1.3fr", // coluna 1 mais estreita, coluna 2 mais larga
  gap: 32
  
}}><section><h2>Pessoas</h2></section>

        <section><h2>Pessoas1</h2></section>
        
      </div>
      
      <div className="gastos"> 
        <h4>Ninguém cadastrado ainda.</h4>
      </div>
      <div className="container">
        
      <input id="input" className="input" type="text" placeholder="Nome da pessoa" />
      <button className="botao" onClick={salvar}>
        Adicionar
      </button>
      </div>
      </div>
      

    </div>
  )
}

export default App

