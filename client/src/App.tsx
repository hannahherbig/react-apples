import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { Card, ClientUpdate, Game, GameState, Player } from "@shared/types";
import {
  Alert,
  Badge,
  Col,
  Container,
  Form,
  Navbar,
  Row,
  Table,
} from "react-bootstrap";

function CardList({
  cards,
  canClick,
  onClick,
}: {
  cards: Card[];
  canClick: boolean;
  onClick: (card: Card) => void;
}) {
  return (
    <dl>
      {cards.map((card) => (
        <>
          <dt>
            {canClick ? (
              <a href="#" onClick={() => onClick(card)}>
                {card.name}
              </a>
            ) : (
              card.name
            )}
          </dt>
          <dd>{card.definition}</dd>
        </>
      ))}
    </dl>
  );
}

export default function App() {
  const [socketUrl, setSocketUrl] = useState("ws://127.0.0.1:8080");
  const [state, setState] = useState<GameState>();

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  function send(data: ClientUpdate) {
    sendMessage(JSON.stringify(data));
  }

  useEffect(() => {
    if (lastMessage !== null) {
      setState(JSON.parse(lastMessage.data));
    }
  }, [lastMessage]);

  const game = state?.game;
  const me = game?.players.find((p) => p.id === state?.id);
  const canplay = !me?.played && !me?.judge && game?.state === "Playing";
  const judge = !!(me?.judge && game?.state === "Judging");
  const last = game?.last;

  function handleJudge(card: Card) {
    send({ pick: card });
  }

  function handlePlay(card: Card) {
    send({ play: card });
  }

  function handleName(name: string) {
    send({ name });
  }

  return (
    <>
      <Navbar
        variant="light"
        expand="lg"
        className="justify-content-between"
        bg="light"
      >
        <Container fluid>
          <Navbar.Brand href="#">Apples to Apples</Navbar.Brand>
        </Container>
      </Navbar>

      {game && (
        <Container fluid>
          <Row fluid>
            <Col fluid>
              <Container fluid>
                {game.adjective && (
                  <Row fluid>
                    <Col fluid>
                      <Alert variant="success">
                        <strong>{game.adjective.name}</strong> -{" "}
                        {game.adjective.definition}
                      </Alert>
                    </Col>
                  </Row>
                )}
                {game.cards && (
                  <Row fluid>
                    <Col fluid>
                      <h4>Cards to judge</h4>
                      <CardList
                        cards={game.cards}
                        canClick={judge}
                        onClick={handleJudge}
                      />
                    </Col>
                  </Row>
                )}
                <Col fluid>
                  <h4>Your hand</h4>
                  <CardList
                    cards={state.hand}
                    canClick={canplay}
                    onClick={handlePlay}
                  />
                </Col>
              </Container>
            </Col>
            <Col fluid>
              <Container fluid>
                <Row fluid>
                  <Col fluid>
                    <ul>
                      <li>
                        <strong>State:</strong> {game.state}
                      </li>
                      {last && (
                        <li>
                          <strong>Last round:</strong>
                          <ul>
                            <li>
                              <strong>Judge:</strong> - {last.judge.name}
                            </li>
                            <li>
                              <strong>Adjective:</strong> {last.adjective.name}{" "}
                              &mdash;
                              {last.adjective.definition}
                            </li>
                            <li>
                              <strong>Winner:</strong> {last.winner.name}
                            </li>
                            <li>
                              <strong>Noun:</strong> {last.noun.name} &mdash;
                              {last.noun.definition}
                            </li>
                          </ul>
                        </li>
                      )}
                    </ul>
                  </Col>
                </Row>
                <Row fluid>
                  <Col>
                    <Form.Control
                      placeholder="Name"
                      value={me?.name}
                      onChange={(e) => {
                        handleName(e.target.value);
                      }}
                    />
                  </Col>
                </Row>
                <Row fluid>
                  <Table bordered>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.players.map((player) => (
                        <tr>
                          <td>
                            {player.name}{" "}
                            {me === player && <Badge bg="primary">You</Badge>}{" "}
                            {player.judge && <Badge bg="secondary">Judge</Badge>}{" "}
                            {player.played && (
                              <Badge bg="success">Played</Badge>
                            )}
                          </td>
                          <td>{player.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Row>
              </Container>
            </Col>
          </Row>
        </Container>
      )}
    </>
  );
}
